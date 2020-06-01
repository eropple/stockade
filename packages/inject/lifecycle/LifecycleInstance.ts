import AsyncLock from 'async-lock';
import hirestime from 'hirestime';
import * as _ from 'lodash';
import { serializeError } from 'serialize-error';
import { Class, Falsey } from 'utility-types';

import { prettyPrintKeys } from '@stockade/utils/conversions';
import { FallbackLogger, Logger } from '@stockade/utils/logging';

import { Domain, DomainProvider, isDomainFactoryProvider, isDomainValueProvider } from '../domain';
import { DependencyKey, forKey } from '../domain/dependency-utils';
import { extractInjectedParameters, prettyPrintProviders } from '../domain/utils';
import { InjectError } from '../error';
import { hasLifecycleCleanup, IOnLifecycleCleanup } from '../IOnLifecycleCleanup';
import { CircularDependencyError, DependencyCreationError, DependencyNotSatisfiedError } from './errors';
import { ILifecycle } from './lifecycles';

export interface IFunctionalInject<T = any> {
  readonly inject: ReadonlyArray<symbol>;
  readonly fn: (...args: Array<any>) => Promise<T>;
}

/**
 *  `LifecycleInstance` defines, as one would expect, an instance
 *  of a lifecycle. This tracks all of the dependencies built through
 *  it. These dependencies can optionally define close handlers that
 *  will be invoked at the end of a lifecycle.
 */
export class LifecycleInstance {
  private static _classInjectCache: Map<Class<any>, ReadonlyArray<symbol>> = new Map();
  private static _nextId: number = 0;

  /**
   * Internal, incremented ID.
   */
  private readonly _id: number;

  //  TODO: change the LifecycleInstance into an iterative solver
  //        For most use cases, a recursive, stack-based solver is fine. It's
  //        got the possibility of smashing a stack, though, and there's probably
  //        some performance loss from using it recursively (though I expect,
  //        without benchmarking, that the wait from promises swamps the perf
  //        difference by a lot--open to evidence to the contrary though).
  private readonly _logger: Logger;

  /**
   * Wait, I can hear you saying. This is NodeJS, it's single-threaded, why do
   * we need a lock? Because, of course, _concurrency_ and _parallelism_ are
   * different things. Look at the 'should handle multiply referenced dependencies'
   * test in behavior-tests/di.spec.ts; there, D requires A, B, and C, but both
   * B and C require A. A naive implementation is going to cause multiple versions
   * of A to be created on every invocation.
   */
  private readonly _lock = new AsyncLock();

  private readonly _resolveCache: Map<symbol, any> = new Map();

  /**
   * By default, an object created with `#instantiate` will be cached and reused
   * for the rest of the duration of the lifecycle instance. This cache holds those.
   */
  private readonly _instantiateCache: Map<string, Exclude<any, Falsey>> = new Map();

  /**
   * Cache for registered temporary objects.
   *
   * @see [#registerTemporary]
   */
  private readonly _temporaryCache: Map<symbol, Exclude<any, undefined>> = new Map();

  /**
   * List of objects that need to be cleaned up on exit.
   */
  private readonly _cleanupOnExit: Array<IOnLifecycleCleanup> = [];

  private _isCleanedUp: boolean = false;

  /**
   * If true, this lifecycle has been cleaned up and cannot be used for resolution.
   */
  get isCleanedUp() { return this._isCleanedUp; }

  /**
   * All lifecycle keys that this lifecycle instance can check. Includes its name
   * plus all aliases.
   */
  readonly allLifecycleKeys: ReadonlyArray<symbol>;

  constructor(
    readonly lifecycle: ILifecycle,
    readonly parent: LifecycleInstance | null,
    logger: Logger,
  ) {
    // TODO:  make this constructor private so we can iterate children
    //        Right now we can't call cleanup() on child lifecycles because we can't
    //        (easily and without breaking encapsulation) keep track of all children.
    //        This could result in situations where a child tries to access a parent
    //        if it misses in its own cache and then errors. This can be an undefined
    //        case and Stockade should be fine, but it's weird and ugly and kind of
    //        random-feeling.
    this._id = LifecycleInstance._nextId;
    LifecycleInstance._nextId += 1;

    this._logger = logger.child({
      lifecycleInstanceId: this._id,
      component: this.constructor.name,
      lifecycleKey: lifecycle.name,
    });

    this.allLifecycleKeys = [this.lifecycle.name, ...this.lifecycle.aliases];

    if (lifecycle.parent) {
      if (!parent) {
        throw new InjectError(
          `LifecycleInstance '${lifecycle.name.description}' requires a parent ` +
          `LifecycleInstance of name '${lifecycle.parent.name.description}'.`,
        );
      }

      if (parent && parent.isCleanedUp) {
        throw new Error(
          `LifecycleInstance '${lifecycle.name.description}' is parented to ` +
          `LifecycleInstance of name '${lifecycle.parent?.name.description}',` +
          `but the parent is cleaned up.`,
        );
      }

      if (parent.lifecycle.name !== lifecycle.parent.name) {
        throw new Error(
          `LifecycleInstance '${lifecycle.name.description}' expects a parent of ` +
          `name '${lifecycle.parent.name.description}, but has a parent of name ` +
          `'${parent.lifecycle.name.description}'.`,
        );
      }
    } else if (!lifecycle.parent && parent) {
      throw new Error(
        `LifecycleInstance '${lifecycle.name.description}' cannot have a parent.`,
      );
    }

    this._logger.trace('Constructed.');
  }

  makeChild(lifecycle: ILifecycle): LifecycleInstance {
    return new LifecycleInstance(lifecycle, this, this._logger);
  }

  async withChild<T>(lifecycle: ILifecycle, fn: (instance: LifecycleInstance) => Promise<T>): Promise<T> {
    const child = this.makeChild(lifecycle);

    const ret = await fn(child);

    await this.cleanup();

    return ret;
  }

  async cleanup(): Promise<void> {
    if (this._isCleanedUp) {
      this._logger.error('Double-cleanup for lifecycle.');

      return;
    }

    this._logger.debug('Cleaning up.');

    // TODO:  make this smarter (if needed; check first!)
    //        This can definitely be made smarter if it's too slow. We record
    //        `IOnLifecycleCleanup` instances when we find
    //        `instantiate`/`resolve`. I didn't want to prematurely optimize
    //        this, but we can stash a set of its dependencies and do a
    //        topographical sort on top of this to paralellize cleanup. Maybe
    //        there's a way to do that in a super clever way and keep this list
    //        in `instantiate` without causing up-front performance?
    //
    //        It's better to be slow during teardown than during initial setup,
    //        though, so we need to see proof first.
    for (const instance of _.reverse(this._cleanupOnExit)) {
      await instance.onLifecycleCleanup();
    }

    this._isCleanedUp = true;
  }

  /**
   * Registers a _temporary_ into the lifecycle instance. This binds the value
   * provided to the specified key for the duration of this lifecycle, so that
   * the object can be sourced from outside of the domain's dependency tree.
   *
   * Examples:
   *
   * - The HTTP request object during the HTTP_REQUEST lifecycle
   * - The routing map derived from the app spec in `HttpFacet`
   *
   * A temporary cannot be removed from the registry, but (due to implementation
   * details) it is possible to re-register over it. (I don't recommend this;
   * it's a good way to invoke spooky action at a distance.)
   *
   * @param key The dependency key to use
   * @param value The value to return for this dependency key
   */
  registerTemporary(key: DependencyKey, value: Exclude<any, Falsey>): this {
    if (this._isCleanedUp) {
      throw new InjectError(`Lifecycle for '${this.lifecycle.name.description} was used after cleanup.`);
    }

    // This could actually use the resolve cache, but I prefer separating them
    // so as to be abetter able to understand the behavior of the DI system when
    // debugging. ("Hey, where did this symbol come from...?")
    this._temporaryCache.set(forKey(key), value);

    return this;
  }

  /**
   *
   * @param key
   * @param domain
   * @param seenKeys Used for loop detection. Don't pass this yourself.
   * @param resolvingDomain Used to provide better messages from parent domains. Don't pass this yourself.
   */
  async resolve<T extends Exclude<any, null>>(
    key: symbol,
    domain: Domain,
    seenKeys: Set<symbol> = new Set(),
    resolvingDomain: Domain = domain,
    getElapsed: () => number = hirestime(),
  ): Promise<T> {
    if (this._isCleanedUp) {
      throw new InjectError(`Lifecycle for '${this.lifecycle.name.description} was used after cleanup.`);
    }

    if (seenKeys.has(key)) {
      throw new CircularDependencyError(
        `Circular dependency in component '${key.description}' with domain ` +
        `'${resolvingDomain.name}', lifecycle '${this.lifecycle.name.description}'. ` +
        `Keys traversed: ${prettyPrintKeys(seenKeys)}; ` +
        `keys in scope: ${domain.provides.map(p => p.key.description)}`,
      );
    }

    seenKeys.add(key);

    const logger = this._logger.child({
      resolvingKey: key.description,
      domainName: domain.name,
    });
    logger.debug(`Attempting to resolve '${key.description}'.`);

    const temporaryCached = this._temporaryCache.get(key);
    if (temporaryCached) {
      logger.trace({ resolutionTimeInMs: getElapsed() }, 'Temporary cache contains object; returning.');

      return temporaryCached;
    }

    // We'll try to grab the object if it's already extant and in-cache. This avoids
    // the lock step.
    const cached = this._resolveCache.get(key);
    if (cached) {
      logger.debug({ resolutionTimeInMs: getElapsed() }, 'Cache hit (pre-lock); returning.');

      return cached;
    }

    logger.trace('Cache miss pre-lock; attempting to acquire lock.');

    if (!key.description) {
      throw new DependencyNotSatisfiedError('Symbol cannot have undefined description.');
    }

    return this._lock.acquire(key.description, async () => {
      const cached2 = this._resolveCache.get(key);
      if (cached2) {
        logger.debug({ resolutionTimeInMs: getElapsed() }, 'Cache hit (post-lock); returning.');

        return cached2;
      }

      logger.trace('Cache miss post-lock; resolving.');
      const provider = await domain.resolveProvider(key, this);

      if (provider) { // create from provider
        const created = await this.createFromProvider<T>(
          provider,
          domain,
          seenKeys,
        );

        this._resolveCache.set(key, created);

        if (hasLifecycleCleanup(created)) {
          logger.trace('Placing in cleanup list.');
          this._cleanupOnExit.push(created);
        }

        logger.debug({ resolutionTimeInMs: getElapsed() }, 'Created and added to cache; returning.');

        return created;
      }

      if (!this.parent) {
        this._logger.debug('No local resolution in domain.');

        // The nice thing (for those who may not know) is that JavaScript
        // defines `Set` to allow you to expand the set in insertion order. So
        // `seenKeys` implicitly acts as a dependency traversal list, while also
        // being at worst O(log n) in a non-pathological implementation.
        throw new DependencyNotSatisfiedError(
          `Failed to resolve component '${key.description}' with domain ` +
          `'${resolvingDomain.name}', lifecycle '${this.lifecycle.name.description}'. ` +
          `Keys traversed: ${prettyPrintKeys(seenKeys)}; ` +
          `providers in scope: ${prettyPrintProviders(domain.provides)}`,
        );
      }

      this._logger.debug('No local resolution in domain. Checking parent.');

      // There is an argument whether we should cache at this level the results
      // of the parent domain's resolution. My intuition is that the time it
      // would take to `await` the parent's `resolve()` and store the cached
      // result would swamp the time it takes to just have the parent check its
      // own cache, and that I have literally spent more time thinking about
      // this than will ever be spent "inefficiently" due to this.
      return this.parent.resolve(key, resolvingDomain, undefined, undefined, getElapsed);
    });
  }

  private async _resolveFromCache<T extends Exclude<any, null>>(

  ) {

  }

  private async createFromProvider<T extends Exclude<any, null>>(
    provider: DomainProvider,
    resolvingDomain: Domain,
    seenKeys: Set<symbol>,
  ): Promise<T> {
    try {
      if (isDomainValueProvider(provider)) {
        return provider.value;
      }

      // TODO:  decide if we want to push class providers down from the domain
      //        We have a class inject cache as a static object in `LifecycleInstance`
      //        because we need to resolve dependencies for non-provided classes
      //        (controllers and hooks in HTTP, etc.)--do we want to stop unwrapping
      //        class providers in `Domain` and do that here?
      if (isDomainFactoryProvider(provider)) {
        // Since we lock in resolve(), doing this as a Promise.all is safe.
        const args = await Promise.all(
          provider.inject.map((dep) => {
            if (dep !== provider.key) {
              return this.resolve(dep, resolvingDomain, new Set(seenKeys));
            }

            if (!this.parent) {
              throw new DependencyCreationError(
                `Provider '${JSON.stringify(provider)}' tried to do an upwards dependency on itself but lacks ` +
                `a parent. In Stockade, it is permissible for a provided component to use its own inject key as ` +
                `a dependency; what this really means is "ask my parent for the dependency and give it to me". ` +
                `The idea is to let you shadow things like the LOGGER dependency in order to inject new fields ` +
                `or something like that. However, it is an error to use this upwards dependency if the lifecycle ` +
                `instantiated within has no parent of its own.`,
              );
            }

            return this.parent.resolve(dep, resolvingDomain);
          }),
        );

        return provider.fn(...args);
      }

      throw new DependencyCreationError(`Could not parse provider '${JSON.stringify(provider)}' during creation.`);
    } catch (err) {
      if (err instanceof DependencyCreationError) {
        throw err;
      }

      throw new DependencyCreationError(
        `Failed to create component from provider '${JSON.stringify(provider)}' via key ` +
        `traversal '${prettyPrintKeys(seenKeys)}'. Error received was: ` +
        `${JSON.stringify(serializeError(err))}`,
        err,
      );
    }
  }

  /**
   * Takes a class that is _not_ part of the dependency injector and attempts to construct
   * it via providers registered to the current domain.
   *
   * @param cls The class to construct
   * @param domain The domain to resolve through
   * @param reusable If `true`, subsequent calls to the same lifecycle will return the same object
   */
  async instantiate<T = any>(
    cls: Class<any>,
    domain: Domain,
    reusable: boolean = true,
  ): Promise<T> {
    if (this._isCleanedUp) {
      throw new InjectError(`Lifecycle for '${this.lifecycle.name.description} was used after cleanup.`);
    }

    const getElapsed = hirestime();

    const logger =
      this._logger.child({ resolveType: 'instantiate', className: cls.name, domainName: domain.name });

    logger.trace('Attempting to instantiate.');
    const reusableKey = `${cls.name}-${domain.name}`;
    if (reusable) {
      logger.trace('This can be a reusable; checking cache.');
      const reusableCached = this._instantiateCache.get(reusableKey);
      if (reusableCached) {
        logger.trace({ resolutionTimeInMs: getElapsed() }, 'Found in reusable cache; returning.');

        return reusableCached;
      }
    }

    let injects: ReadonlyArray<symbol> | undefined = LifecycleInstance._classInjectCache.get(cls);

    if (!injects) {
      injects = extractInjectedParameters(cls);
      LifecycleInstance._classInjectCache.set(cls, injects);
    }

    const resolvedInjects = await Promise.all(injects.map(i => this.resolve(i, domain)));
    const ret = new cls(...resolvedInjects);

    if (reusable) {
      logger.trace('Placing in reusable cache.');
      this._instantiateCache.set(reusableKey, ret);
    }

    if (hasLifecycleCleanup(ret)) {
      logger.trace('Placing in cleanup list.');
      this._cleanupOnExit.push(ret);
    }

    logger.trace({ resolutionTimeInMs: getElapsed() }, 'Returning instantiated object.');

    return ret;
  }

  async executeFunctional<T = any>(
    domain: Domain,
    functional: IFunctionalInject<T>,
  ): Promise<T> {
    if (this._isCleanedUp) {
      throw new InjectError(`Lifecycle for '${this.lifecycle.name.description} was used after cleanup.`);
    }

    const { inject, fn } = functional;
    const resolvedInjects = await Promise.all(inject.map(i => this.resolve(i, domain)));

    return fn(...resolvedInjects);
  }
}

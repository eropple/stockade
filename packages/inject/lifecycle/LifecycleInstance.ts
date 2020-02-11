import AsyncLock from 'async-lock';
import { serializeError } from 'serialize-error';
import { Class } from 'utility-types';

import { prettyPrintKeys } from '@stockade/utils/conversions';
import { Logger } from '@stockade/utils/logging';

import { Domain, DomainProvider, isDomainFactoryProvider, isDomainValueProvider } from '../domain';
import { extractInjectedParameters, prettyPrintProviders } from '../domain/utils';
import { CircularDependencyError, DependencyCreationError, DependencyNotSatisfiedError } from './errors';
import { ILifecycle } from './lifecycles';

/**
 *  `LifecycleInstance` defines, as one would expect, an instance
 *  of a lifecycle. This tracks all of the dependencies built through
 *  it. These dependencies can optionally define close handlers that
 *  will be invoked at the end of a lifecycle.
 */
export class LifecycleInstance {
  private static _classInjectCache: Map<Class<any>, ReadonlyArray<symbol>> = new Map();

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

  constructor(
    readonly lifecycle: ILifecycle,
    readonly parent: LifecycleInstance | null,
    logger: Logger,
  ) {
    this._logger = logger.child({
      component: this.constructor.name,
      lifecycleKey: lifecycle.name,
    });

    if (lifecycle.parent) {
      if (!parent) {
        throw new Error(
          `LifecycleInstance '${lifecycle.name.description}' requires a parent ` +
          `LifecycleInstance of name '${lifecycle.parent.name.description}'.`,
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
  ): Promise<T> {
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

    // We'll try to grab the object if it's already extant and in-cache. This avoids
    // the lock step.
    const cached = this._resolveCache.get(key);
    if (cached) {
      logger.debug('Cache hit (pre-lock); returning.');

      return cached;
    }

    logger.trace('Cache miss pre-lock; attempting to acquire lock.');

    return this._lock.acquire(key.description, async () => {
      const cached2 = this._resolveCache.get(key);
      if (cached2) {
        logger.debug('Cache hit (post-lock); returning.');

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
      return this.parent.resolve(key, resolvingDomain);
    });
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
          provider.inject.map(dep => this.resolve(
            dep,
            resolvingDomain,
            new Set(seenKeys)),
          ),
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

  async instantiate<T = any>(
    cls: Class<any>,
    domain: Domain,
  ): Promise<T> {
    let injects: ReadonlyArray<symbol> | undefined = LifecycleInstance._classInjectCache.get(cls);

    if (!injects) {
      injects = extractInjectedParameters(cls);
      LifecycleInstance._classInjectCache.set(cls, injects);
    }

    const resolvedInjects = await Promise.all(injects.map(i => this.resolve(i, domain)));

    return new cls(...resolvedInjects);
  }
}

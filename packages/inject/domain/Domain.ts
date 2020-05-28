import { isString, isSymbol } from 'util';
import { Class } from 'utility-types';

import { FallbackLogger, Logger } from '@stockade/utils/logging';
import { isClass } from '@stockade/utils/type-guards';

import { getAutoComponentMetadataOrFail } from '../annotations/auto-component.decorator';
import { ILifecycle, LifecycleInstance, SINGLETON } from '../lifecycle';
import { forKey } from './dependency-utils';
import { IDomainDefinition } from './IDomainDefinition';
import {
  DomainProvider,
  DynamicProviderFn,
  ExportDefinition,
  IDomainExport,
  IDomainFactoryProvider,
  IDomainImport,
  IDomainValueProvider,
  ImportDefinition,
  IProviderDefinition,
  isExportDefinition,
  isFactoryProviderDefinition,
  isImportDefinition,
  isValueProviderDefinition,
  ResolutionKey,
} from './types';
import { extractInjectedParameters } from './utils';

// TODO: note in docs that `:_:` is illegal in provider names.
function cacheKeyForResolutionKey(key: symbol, lifecycleKey: symbol) {
  return `${key.description}:_:${lifecycleKey.description}`;
}

function cacheKeysForLifecycle(key: symbol, lifecycle: ILifecycle): Array<string> {
  return [
    cacheKeyForResolutionKey(key, lifecycle.name),
    ...lifecycle.aliases.map(i => cacheKeyForResolutionKey(key, i)),
  ];
}

/**
 * The reified, normalized instance of an injector domain. Users create a
 * more friendly `IDomainDefinition`, which is turned into a `Domain` for
 * processing at runtime.
 *
 * Effectively, each Domain should track a lookup table for all symbols
 * that it can "see", and what providers they point to. This cache can be
 * built through the following steps:
 *
 * -  Check `imports`; if it is satisfied by the parent, return that. (This
 *    implies that the top level can override its children, and that is
 *    correct and intentional.)
 * -  Check `provides` at the current layer. If it exists, it will be
 *    cached.
 * -  Check `children` by calling `getExport()`; if one returns successfully,
 *    it will be cached.
 *
 * The same logic is used when requesting an export via `getExport()`.
 * It's thus possible that, in a misapplied situation, a domain could
 * export back _out_ something that it imported _in_. However, that
 * won't happen in practice, as the parent will check its own `provides`
 * before its own `children`, which would cause a potential reference
 * loop.
 */
export class Domain<TDomainDefinition extends IDomainDefinition = IDomainDefinition> {
  private readonly _logger: Logger;

  private readonly _importCache: Set<string> = new Set();
  private readonly _exportCache: Set<string> = new Set();
  private readonly _providesCache: Map<string, DomainProvider> = new Map();

  private readonly _resolveCache: Map<string, DomainProvider | null> = new Map();

  private _descendants: ReadonlyArray<Domain<TDomainDefinition>> | null = null;
  private readonly _children: Array<Domain<TDomainDefinition>>;

  constructor(
    readonly name: string,
    children: Array<Domain<TDomainDefinition>>,
    readonly parent: Domain | null,
    readonly imports: ReadonlyArray<IDomainImport>,
    readonly exports: ReadonlyArray<IDomainExport>,
    readonly provides: ReadonlyArray<DomainProvider>,
    readonly dynamicProviders: DynamicProviderFn,
    readonly definition: TDomainDefinition,
    logger: Logger,
  ) {
    this._logger = logger.child({ component: this.constructor.name, domainName: name });
    this._logger.trace({ parentName: parent?.name }, 'Constructing domain.');

    this._children = children;

    if (!parent && imports.length > 0) {
      throw new Error(`Domain '${name}' has imports, but no parent?`);
    }

    imports.forEach(i =>
      this._importCache.add(cacheKeyForResolutionKey(i.key, i.lifecycle.name)));
    exports.forEach(e =>
      this._exportCache.add(cacheKeyForResolutionKey(e.key, e.lifecycle.name)));
    provides.forEach(p =>
      this._providesCache.set(cacheKeyForResolutionKey(p.key, p.lifecycle.name), p));
  }

  /**
   * Gets all direct child domains of this domain.
   */
  get children(): ReadonlyArray<Domain<TDomainDefinition>> { return this._children; }

  /**
   * Recursively gets all child domains of this domain. Does NOT include this domain
   * in the list.
   */
  get descendants(): ReadonlyArray<Domain<TDomainDefinition>> {
    if (!this._descendants) {
      this._descendants = [...this._children, ...this._children.flatMap(c => c.descendants)];
    }

    return this._descendants;
  }

  /**
   *
   * @param resolutionKey the resolution being searched for
   * @param requireExport
   */
  async resolveProvider(
    key: symbol,
    lifecycle: LifecycleInstance,
    exportedOnly: boolean = false,
  ): Promise<DomainProvider | null> {
    const logger = this._logger.child({
      resolutionKey: {
        key: key.description,
        lifecycleKey: lifecycle.lifecycle.name.description,
      },
    });
    logger.debug('Beginning resolution.');

    // TODO: note in docs that `:_:` is illegal in provider names.
    const cacheKey = cacheKeyForResolutionKey(key, lifecycle.lifecycle.name);

    // we store `null` results in the cache to avoid having to re-query on
    // unsatisfiable results.
    const cached = this._resolveCache.get(cacheKey);
    if (cached || cached === null) {
      logger.debug('Found in cache; returning.');

      return cached;
    }

    // First, check the parent (as the parent always overrides, if it
    // exists)--check the class comment for details!
    //
    // During an export resolution query, we don't call the parent.
    if (!exportedOnly && this._importCache.has(cacheKey)) {
      logger.debug('Found in import cache; deferring to parent.');

      const parentResult = await this.parent!.resolveProvider(key, lifecycle);
      if (!parentResult) {
        logger.error('Parent did not have - bailing.');
        throw new Error(
          `Domain '${this.name}' requested '${key.description} in ` +
          `${lifecycle.lifecycle.name.description}' from parent ` +
          `'${this.parent!.name}', but received null. This suggests that the ` +
          `parent doesn't provide (or have a child that exports it into their ` +
          `shared parent's scope.)`);
      }

      return parentResult;
    }

    // Parent didn't have, so let's test locally.
    let provider = this._providesCache.get(cacheKey) || null;
    if (provider) {
      logger.debug('Found in provides cache.');
    } else {
      logger.trace('Not found in provides cache; attempting dynamic resolution.');
      const dynamicProviderDef = await this.dynamicProviders(this, key, lifecycle, exportedOnly);

      if (dynamicProviderDef) {
        logger.debug('Dynamic provider is a HIT; normalizing and using.');
        provider = Domain.normalizeProvider(dynamicProviderDef, logger);
      } else {
        logger.trace('No dynamic provider.');
      }
    }

    // Not found locally; let's ask our children.
    if (!provider) {
      for (const child of this._children) {
        logger.trace({ childDomain: child.name }, 'Testing child domain.');
        provider = await child.resolveProvider(key, lifecycle, true);

        if (provider) {
          logger.debug({ childDomain: child.name }, 'Found in child; caching and returning.');
        }
      }
    }

    if (!provider) {
      logger.debug('No provider found.');
    }

    return provider;
  }

  /**
   * Walks the tree defined by one (and potentially an unbounded-depth nest of)
   * `IDomainDefinition` objects to create the `Domain` objects expected by the
   * injector resolver.
   *
   * @param def The definition of the domain to construct.
   * @param parent The parent domain of the one being created, or undefined.
   * @param baseNameStack The base name to which this domain's name should be appended.
   */
  static fromDefinition<TDomainDefinition extends IDomainDefinition>(
    def: TDomainDefinition,
    parent: Domain<TDomainDefinition> | null = null,
    baseNameStack: Array<string> = [],
    baseLogger: Logger = FallbackLogger,
  ): Domain<TDomainDefinition> {
    const nameStack = [ ...baseNameStack, def.name ];
    const domainName = nameStack.join('.');
    const logger = baseLogger.child({ component: 'DomainBuilder', domainName });

    let imports: Array<IDomainImport>;
    try {
      imports = (def.imports || []).map(i => Domain.normalizeImport(i));
    } catch (err) {
      logger.error({ err, importDefinition: def.imports }, 'Error when parsing imports.');
      throw err;
    }

    let exports: Array<IDomainExport>;
    try {
      exports = (def.exports || []).map(e => Domain.normalizeExport(e));
    } catch (err) {
      logger.error({ err, exportDefinition: def.exports }, 'Error when parsing exports.');
      throw err;
    }

    let provides: Array<DomainProvider>;
    try {
      provides = (def.provides || []).map(p => Domain.normalizeProvider(p, logger));
    } catch (err) {
      logger.error({ err, providesDefinition: def.provides }, 'Error when parsing provides.');
      throw err;
    }

    logger.trace({
      importCount: imports.length,
      exportCount: exports.length,
      provideCount: provides.length,
    }, 'Building domain.');

    const d = new Domain<TDomainDefinition>(
      domainName,
      [],
      parent,
      imports,
      exports,
      provides,
      def.dynamicProviders || (() => null),
      def,
      baseLogger,
    );

    const children = (def.children || [])
      .map(c => Domain.fromDefinition<TDomainDefinition>(
        // @ts-ignore
        // TODO: how to make this compile clean?
        // Formally the assertion is that `TDomainDefinition`'s children should all also be
        // of type `TDomainDefinition` but I don't know how to make that work with inherited
        // interfaces.
        c,
        d,
        nameStack,
      ));

    if (children.length > 0) {
      logger.trace({ childCount: children.length }, 'Children built; adding to parent.');
      d._children.push(...children);
    }

    // This ends up being bidirectional so
    Object.freeze(d._children);

    return d;
  }

  private static normalizeImport(i: string | symbol | ImportDefinition | Class<any>): IDomainImport {
    if (isImportDefinition(i)) {
      return { key: forKey(i.key), lifecycle: i.lifecycle ?? SINGLETON, optional: i.optional };
    }

    if (isString(i) || isSymbol(i)) {
      return { key: forKey(i), lifecycle: SINGLETON, optional: false };
    }

    const autoComponentMetadata = getAutoComponentMetadataOrFail(i);

    return {
      key: forKey(i),
      lifecycle: autoComponentMetadata.lifecycle ?? SINGLETON,
      optional: false,
    };
  }

  private static normalizeExport(e: string | symbol | ExportDefinition | Class<any>): IDomainExport {
    if (isExportDefinition(e)) {
      return { key: forKey(e.key), lifecycle: e.lifecycle ?? SINGLETON };
    }

    if (isString(e) || isSymbol(e)) {
      return { key: forKey(e), lifecycle: SINGLETON };
    }

    if (isClass(e)) {// autocomponent
      const autoComponentMetadata = getAutoComponentMetadataOrFail(e);

      return { key: forKey(e), lifecycle: autoComponentMetadata.lifecycle };
    }

    throw new Error(`Attempted to normalize export '${e}', but didn't know how.`);
  }

  private static normalizeProvider(p: Class<any> | IProviderDefinition, logger: Logger): DomainProvider {
    if (isValueProviderDefinition(p)) {
      const vp: IDomainValueProvider = {
        key: forKey(p.key),
        lifecycle: p.lifecycle ?? SINGLETON,
        value: p.value,
      };

      return vp;
    }

    if (isFactoryProviderDefinition(p)) {
      const fp: IDomainFactoryProvider = {
        key: forKey(p.key),
        lifecycle: p.lifecycle ?? SINGLETON,
        fn: p.fn,
        inject: (p.inject || []).map(forKey),
        extractedFromAutoComponent: false,
      };

      return fp;
    }

    // We aren't guaranteed to be sure what the heck this is supposed to be
    // here but it's a good guess that it's going to be a Class. If it's not,
    // it shouldn't have autocomponent data, so...

    if (isClass(p)) {
      const autoComponentMetadata = getAutoComponentMetadataOrFail(p);

      const provider: IDomainFactoryProvider = {
        key: forKey(autoComponentMetadata.key ?? p),
        lifecycle: autoComponentMetadata.lifecycle ?? SINGLETON,
        inject: extractInjectedParameters(p),
        fn: (...args: Array<any>) => new p(...args),
        extractedFromAutoComponent: true,
      };

      return provider;
    }

    throw new Error(`Attempted to normalize a provider '${p}', but no idea what this is.`);
  }
}

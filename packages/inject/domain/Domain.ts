import { isString, isSymbol } from 'util';
import { Class } from 'utility-types';

import { FallbackLogger, Logger } from '@stockade/utils/logging';
import { isClass } from '@stockade/utils/type-guards';

import { getAutoComponentMetadataOrFail } from '../annotations/auto-component.decorator';
import { ILifecycle, LifecycleInstance, SINGLETON, SUB_FACET } from '../lifecycle';
import { forKey } from './dependency-utils';
import { IDomainDefinition } from './IDomainDefinition';
import {
  DomainProvider,
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

const DEFAULT_COMPONENT_LIFECYCLE_KEY = SUB_FACET;


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

  private readonly _validImports: Map<symbol, Set<symbol>> = new Map();
  private readonly _validExports: Map<symbol, Set<symbol>> = new Map();
  private readonly _providesCache: Map<symbol, Map<symbol, DomainProvider>> = new Map();

  private readonly _resolveCache: Map<symbol, Map<symbol, DomainProvider | null>> = new Map();

  private _descendants: ReadonlyArray<Domain<TDomainDefinition>> | null = null;
  private readonly _children: Array<Domain<TDomainDefinition>>;

  constructor(
    readonly name: string,
    children: Array<Domain<TDomainDefinition>>,
    readonly parent: Domain | null,
    readonly imports: ReadonlyArray<IDomainImport>,
    readonly exports: ReadonlyArray<IDomainExport>,
    readonly provides: ReadonlyArray<DomainProvider>,
    readonly definition: TDomainDefinition,
    logger: Logger,
  ) {
    this._logger = logger.child({ component: this.constructor.name, domainName: name });
    this._logger.trace({ parentName: parent?.name }, 'Constructing domain.');

    this._children = children;

    if (!parent && imports.length > 0) {
      throw new Error(`Domain '${name}' has imports, but no parent?`);
    }

    imports.forEach(i => {
      let m = this._validImports.get(i.lifecycle);
      if (!m) {
        m = new Set<symbol>();
        this._validImports.set(i.lifecycle, m);
      }

      m.add(i.key);
    });
    exports.forEach(e =>{
      let m = this._validExports.get(e.lifecycle);
      if (!m) {
        m = new Set<symbol>();
        this._validExports.set(e.lifecycle, m);
      }

      m.add(e.key);
    });
    provides.forEach(p => {
      let m = this._providesCache.get(p.lifecycle);
      if (!m) {
        m = new Map<symbol, DomainProvider>();
        this._providesCache.set(p.lifecycle, m);
      }

      m.set(p.key, p);
    });
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

  isLocallyResolvable(key: symbol, lifecycle: LifecycleInstance): boolean {
    return lifecycle.allLifecycleKeys.some(
      k => this._providesCache.get(k)?.get(key),
    );
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
    // TODO:  improve performance here
    //        This is relatively slow if you "miss" a key and have to check
    //        the lifecycle's aliases. As we're focusing mostly on using
    //        `FACET` and `SUB_FACET` as lifecycle keys, this is potentially
    //        a concern. We can unroll the cache keys being used in
    //        `_doResolveProvider` and do something more clever when needed.
    for (const name of lifecycle.allLifecycleKeys) {
      const ret = await this._doResolveProvider(key, lifecycle, name, exportedOnly);

      if (ret) { return ret; }
    }

    return null;
  }

  private async _doResolveProvider(
    key: symbol,
    lifecycle: LifecycleInstance,
    lifecycleName: symbol,
    exportedOnly: boolean,
  ): Promise<DomainProvider | null> {
    const logger = this._logger.child({
      resolutionKey: {
        key: key.description,
        lifecycleKey: lifecycleName.description,
      },
    });
    logger.debug('Beginning resolution.');

    // we store `null` results in the cache to avoid having to re-query on
    // unsatisfiable results.
    const cached = this._resolveCache.get(lifecycleName)?.get(key);
    if (cached || cached === null) {
      logger.debug('Found in cache; returning.');

      return cached;
    }

    // First, check the parent (as the parent always overrides, if it
    // exists)--check the class comment for details!
    //
    // During an export resolution query, we don't call the parent.
    if (!exportedOnly && this._validImports.get(lifecycleName)?.has(key)) {
      logger.debug('Found in import cache; deferring to parent.');

      const parentResult = await this.parent!.resolveProvider(key, lifecycle, false);
      if (!parentResult) {
        logger.error('Parent did not have - bailing.');
        throw new Error(
          `Domain '${this.name}' requested '${key.description} in ` +
          `${lifecycleName.description}' from parent ` +
          `'${this.parent!.name}', but received null. This suggests that the ` +
          `parent doesn't provide (or have a child that exports it into their ` +
          `shared parent's scope.)`);
      }

      return parentResult;
    }

    // Parent didn't have, so let's test locally.
    let provider = this._providesCache.get(lifecycleName)?.get(key) || null;
    if (provider) {
      logger.debug('Found in provides cache.');
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

    let _resolveSubmap = this._resolveCache.get(lifecycleName);
    if (!_resolveSubmap) {
      _resolveSubmap = new Map();
      this._resolveCache.set(lifecycleName, _resolveSubmap);
    }

    _resolveSubmap.set(key, provider);

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
      return {
        key: forKey(i.key),
        lifecycle: i.lifecycle ?? DEFAULT_COMPONENT_LIFECYCLE_KEY,
        optional: i.optional,
      };
    }

    if (isString(i) || isSymbol(i)) {
      return { key: forKey(i), lifecycle: DEFAULT_COMPONENT_LIFECYCLE_KEY, optional: false };
    }

    const autoComponentMetadata = getAutoComponentMetadataOrFail(i);

    return {
      key: forKey(i),
      lifecycle: autoComponentMetadata.lifecycle ?? DEFAULT_COMPONENT_LIFECYCLE_KEY,
      optional: false,
    };
  }

  private static normalizeExport(e: string | symbol | ExportDefinition | Class<any>): IDomainExport {
    if (isExportDefinition(e)) {
      return { key: forKey(e.key), lifecycle: e.lifecycle ?? DEFAULT_COMPONENT_LIFECYCLE_KEY };
    }

    if (isString(e) || isSymbol(e)) {
      return { key: forKey(e), lifecycle: DEFAULT_COMPONENT_LIFECYCLE_KEY };
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
        lifecycle: p.lifecycle ?? DEFAULT_COMPONENT_LIFECYCLE_KEY,
        value: p.value,
      };

      return vp;
    }

    if (isFactoryProviderDefinition(p)) {
      const fp: IDomainFactoryProvider = {
        key: forKey(p.key),
        lifecycle: p.lifecycle ?? DEFAULT_COMPONENT_LIFECYCLE_KEY,
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
        lifecycle: autoComponentMetadata.lifecycle ?? DEFAULT_COMPONENT_LIFECYCLE_KEY,
        inject: extractInjectedParameters(p),
        fn: (...args: Array<any>) => new p(...args),
        extractedFromAutoComponent: true,
      };

      return provider;
    }

    throw new Error(`Attempted to normalize a provider '${p}', but no idea what this is.`);
  }
}

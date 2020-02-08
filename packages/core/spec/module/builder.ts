import { Class } from 'utility-types';

import {
  DynamicProviderFn,
  ExportDefinition,
  ImportDefinition,
  IProviderDefinition,
} from '@stockade/inject/domain';
import { DependencyKey } from '@stockade/inject/domain/dependency-utils';

import { CoreError } from '../../errors';
import { FacetBuilderBase } from '../facets';
import { IModule, isStockadeModule } from './IModule';

export abstract class ModuleBuilderBase<TModule extends IModule> {
  protected _mod: TModule;

  constructor(m: TModule) {
    this._mod = m;
  }

  children(...ch: Array<IModule | ModuleBuilder>): this {
    const result = ch.map(c =>
      isStockadeModule(c) ? c : c.build());
    this._mod = { ...this._mod, children: (this._mod.children ?? []).concat(...result) };

    return this;
  }

  import(...i: Array<ImportDefinition | DependencyKey>): this {
    this._mod = { ...this._mod, imports: (this._mod.imports ?? []).concat(...i) };

    return this;
  }

  export(...e: Array<ExportDefinition | DependencyKey>): this {
    this._mod = { ...this._mod, exports: (this._mod.exports ?? []).concat(...e) };

    return this;
  }

  provide(...p: Array<IProviderDefinition | Class<any>>): this {
    this._mod = { ...this._mod, provides: (this._mod.provides ?? []).concat(...p) };

    return this;
  }

  dynamicallyProvide(fn: DynamicProviderFn): this {
    this._mod = { ...this._mod, dynamicProviders: fn };

    return this;
  }

  build(): TModule {
    return this._mod;
  }
}

export class ModuleBuilder extends ModuleBuilderBase<IModule> {
  readonly $isStockadeModuleBuilder: true = true;

  constructor(name: string) {
    super({ name, $isStockadeModule: true });
  }

  apply(facet: FacetBuilderBase<IModule>): this {
    this._mod = facet.transform(this._mod);

    return this;
  }
}

/**
 * Initializes a new `ModuleBuilder`.
 *
 * @param name The name of the module. Can be any string except 'APP'.
 */
export function Module(name: string): ModuleBuilder {
  if (name === 'APP') {
    throw new CoreError('A module that is not an `IAppSpec` cannot be named `APP`.');
  }

  return new ModuleBuilder(name);
}

export function isModuleBuilder(o: any): o is ModuleBuilder {
  return (o as any).$isStockadeModuleBuilder;
}

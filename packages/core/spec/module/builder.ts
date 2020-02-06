import { Class } from 'utility-types';

import {
  DynamicProviderFn,
  ExportDefinition,
  ImportDefinition,
  IProviderDefinition,
} from '@stockade/inject/domain';
import { DependencyKey } from '@stockade/inject/domain/dependency-utils';

import { CoreError } from '../../errors';
import { IModule } from './IModule';

export abstract class ModuleBuilderBase<TModule extends IModule> {
  private readonly mod: TModule;

  constructor(m: TModule) {
    this.mod = m;
  }

  children(...ch: Array<IModule>) {
    this.mod.children = this.mod.children ?? [];
    this.mod.children.push(...ch);

    return this;
  }

  import(...i: Array<ImportDefinition | DependencyKey>) {
    this.mod.imports = this.mod.imports ?? [];
    this.mod.imports.push(...i);

    return this;
  }

  export(...e: Array<ExportDefinition | DependencyKey>) {
    this.mod.exports = this.mod.exports ?? [];
    this.mod.exports.push(...e);

    return this;
  }

  provide(...p: Array<IProviderDefinition | Class<any>>) {
    this.mod.provides = this.mod.provides ?? [];
    this.mod.provides.push(...p);

    return this;
  }

  dynamicallyProvide(fn: DynamicProviderFn) {
    this.mod.dynamicProviders = fn;

    return this;
  }

  build(): TModule {
    return this.mod;
  }
}

export class ModuleBuilder extends ModuleBuilderBase<IModule> {
  constructor(name: string) {
    super({ name, $isStockadeModule: true });
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

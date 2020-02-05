import { Class } from 'utility-types';

import {
  DynamicProviderFn,
  ExportDefinition,
  ImportDefinition,
  IProviderDefinition,
} from '@stockade/inject/domain';
import { DependencyKey } from '@stockade/inject/domain/dependency-utils';

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
    super({ name });
  }
}

export function Module(name: string): ModuleBuilder {
  return new ModuleBuilder(name);
}

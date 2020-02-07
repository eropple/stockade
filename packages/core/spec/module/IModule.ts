import { Class } from 'utility-types';

import {
  DynamicProviderFn,
  ExportDefinition,
  IDomainDefinition,
  ImportDefinition,
  IProviderDefinition,
} from '@stockade/inject';
import { DependencyKey } from '@stockade/inject/domain/dependency-utils';

/**
 * The basic definition of a Stockade module.
 */
export interface IModule extends IDomainDefinition {
  $isStockadeModule: true;

  name: string;
  children?: Array<IModule>;
  imports?: Array<ImportDefinition | DependencyKey>;
  exports?: Array<ExportDefinition | DependencyKey>;
  provides?: Array<IProviderDefinition | Class<any>>;
  dynamicProviders?: DynamicProviderFn;
}

export function isStockadeModule(o: unknown): o is IModule {
  return (o as any).$isStockadeModule;
}

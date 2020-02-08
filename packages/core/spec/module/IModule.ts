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
  readonly $isStockadeModule: true;

  readonly name: string;
  readonly children?: ReadonlyArray<IModule>;
  readonly imports?: ReadonlyArray<ImportDefinition | DependencyKey>;
  readonly exports?: ReadonlyArray<ExportDefinition | DependencyKey>;
  readonly provides?: ReadonlyArray<IProviderDefinition | Class<any>>;
  readonly dynamicProviders?: DynamicProviderFn;
}

export function isStockadeModule(o: unknown): o is IModule {
  return (o as any).$isStockadeModule;
}

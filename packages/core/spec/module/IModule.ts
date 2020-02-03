import { Class } from 'utility-types';

import { IDomainDefinition } from '@stockade/inject';
import {
  DynamicProviderFn,
  ExportDefinition,
  ImportDefinition,
  IProviderDefinition,
} from '@stockade/inject/domain';
import { DependencyKey } from '@stockade/inject/domain/dependency-utils';

export interface IModule extends IDomainDefinition {
  name: string;
  children?: Array<IDomainDefinition>;
  imports?: Array<ImportDefinition | DependencyKey>;
  exports?: Array<ExportDefinition | DependencyKey>;
  provides?: Array<IProviderDefinition | Class<any>>;
  dynamicProviders?: DynamicProviderFn;
}

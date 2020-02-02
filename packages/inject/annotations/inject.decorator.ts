import 'reflect-metadata';

import { SetMetadataForParameter } from '@stockade/utils/metadata';

import { DependencyKey, forKey } from '../domain/dependency-utils';
import { MetadataKeys } from './metadata-keys';

export const Inject =
  (key: DependencyKey) => SetMetadataForParameter<symbol>(MetadataKeys.INJECT, forKey(key));

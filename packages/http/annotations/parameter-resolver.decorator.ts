import { DependencyKey } from '@stockade/inject';
import { forKey } from '@stockade/inject/domain/dependency-utils';
import { SetMetadataForParameter } from '@stockade/utils/metadata';

import { IParameterResolver } from '../facet/controller-info';
import { AnnotationKeys } from './keys';

export interface IParameterResolverArgs<T = any> {
  friendlyName: string;
  inject: ReadonlyArray<DependencyKey>;
  fn: (...args: Array<any>) => Promise<T>;

  [extraArgs: string]: any;
}

export function ParameterResolver({ friendlyName, inject, fn }: IParameterResolverArgs): ParameterDecorator {
  const info: IParameterResolver = {
    friendlyName,
    inject: inject.map(forKey),
    fn,
  };

  return SetMetadataForParameter(AnnotationKeys.PARAMETER_RESOLVER, info);
}

import { DependencyKey } from '@stockade/inject';
import { forKey } from '@stockade/inject/domain/dependency-utils';
import { SetMetadataForParameter } from '@stockade/utils/metadata';

import {
  IMappedEndpointRequestBody,
  IParameterResolver,
  isMappedEndpointRequestBody,
  MappedEndpointParameter,
} from '../types/controller-info';
import { AnnotationKeys } from './keys';
import { RequestBodyArgs } from './request-accessors.decorator';

export interface IParameterResolverArgs<T = any> {
  friendlyName: string;
  inject: ReadonlyArray<DependencyKey>;
  fn: (...args: Array<any>) => Promise<T>;
  implicitParameter?: MappedEndpointParameter,
  requestBody?: RequestBodyArgs,

  [extraArgs: string]: any;
}

export function ParameterResolver({
  friendlyName,
  inject,
  fn,
  implicitParameter,
  requestBody,
}: IParameterResolverArgs): ParameterDecorator {
  let requestBodyContent: IMappedEndpointRequestBody | undefined;

  if (requestBody) {
    if (isMappedEndpointRequestBody(requestBody)) {
      // is a pre-chewed content type for us
      requestBodyContent = {
        contentType: requestBody.contentType ?? 'application/json',
        schema: requestBody.schema,
      };
    } else {
      // is a Schema (class, JSON Schema, or JSON Schema + class embeds)
      requestBodyContent = { contentType: 'application/json', schema: requestBody };
    }
  }

  const info: IParameterResolver = {
    friendlyName,
    inject: inject.map(forKey),
    fn,
    implicitParameter,
    requestBody: requestBodyContent,
  };

  return SetMetadataForParameter(AnnotationKeys.PARAMETER_RESOLVER, info);
}

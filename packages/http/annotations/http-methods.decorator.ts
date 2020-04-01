import { HTTPMethod } from 'fastify';

import { setMetadata } from '@stockade/utils/metadata';

import { IMethodOptions, IMethodWithBodyOptions } from '../facet/controller-info';
import { stripPathSlashes } from '../utils';
import { AnnotationKeys } from './keys';

function HttpMethodAndRoute(
  method: HTTPMethod,
  route: string,
  options: IMethodOptions | IMethodWithBodyOptions,

): MethodDecorator {
  return (target, key, descriptor) => {
    setMetadata(AnnotationKeys.ROUTE_METHOD, method, target, key);
    setMetadata(AnnotationKeys.ROUTE_PATH, stripPathSlashes(route), target, key);
    setMetadata(AnnotationKeys.ROUTE_OPTIONS, options, target, key);
  };
}

export function Get(route: string = '', options: IMethodOptions = {}) {
  return HttpMethodAndRoute('GET', route, options);
}

export function Post(route: string = '', options: IMethodWithBodyOptions = {}) {
  return HttpMethodAndRoute('POST', route, options);
}

export function Put(route: string = '', options: IMethodWithBodyOptions = {}) {
  return HttpMethodAndRoute('PUT', route, options);
}

export function Delete(route: string = '', options: IMethodOptions = {}) {
  return HttpMethodAndRoute('DELETE', route, options);
}

export function Patch(route: string = '', options: IMethodWithBodyOptions = {}) {
  return HttpMethodAndRoute('PATCH', route, options);
}

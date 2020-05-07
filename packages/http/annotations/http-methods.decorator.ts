import { HTTPMethod } from 'fastify';

import { setMetadata } from '@stockade/utils/metadata';

import { IMethodOptions, IMethodWithBodyOptions } from '../types/controller-info';
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

export function Get(options?: IMethodOptions): MethodDecorator;
export function Get(route?: string, options?: IMethodOptions): MethodDecorator;
export function Get(r1?: string | IMethodOptions, r2?: IMethodOptions): MethodDecorator {
  const route: string = typeof(r1) === 'string' ? r1 : '';
  const options =
    typeof(r1) === 'object'
      ? r1
      : typeof(r2) === 'object'
        ? r2
        : {};

  return HttpMethodAndRoute('GET', route, options);
}

export function Post(options?: IMethodWithBodyOptions): MethodDecorator;
export function Post(route?: string, options?: IMethodWithBodyOptions): MethodDecorator;
export function Post(r1?: string | IMethodOptions, r2?: IMethodWithBodyOptions): MethodDecorator {
  const route: string = typeof(r1) === 'string' ? r1 : '';
  const options =
    typeof(r1) === 'object'
      ? r1
      : typeof(r2) === 'object'
        ? r2
        : {};

  return HttpMethodAndRoute('POST', route, options);
}

export function Put(options?: IMethodWithBodyOptions): MethodDecorator;
export function Put(route?: string, options?: IMethodWithBodyOptions): MethodDecorator;
export function Put(r1?: string | IMethodOptions, r2?: IMethodWithBodyOptions): MethodDecorator {
  const route: string = typeof(r1) === 'string' ? r1 : '';
  const options =
    typeof(r1) === 'object'
      ? r1
      : typeof(r2) === 'object'
        ? r2
        : {};

  return HttpMethodAndRoute('PUT', route, options);
}

export function Delete(options?: IMethodOptions): MethodDecorator;
export function Delete(route?: string, options?: IMethodOptions): MethodDecorator;
export function Delete(r1?: string | IMethodOptions, r2?: IMethodOptions): MethodDecorator {
  const route: string = typeof(r1) === 'string' ? r1 : '';
  const options =
    typeof(r1) === 'object'
      ? r1
      : typeof(r2) === 'object'
        ? r2
        : {};

  return HttpMethodAndRoute('DELETE', route, options);
}

export function Patch(options?: IMethodWithBodyOptions): MethodDecorator;
export function Patch(route?: string, options?: IMethodWithBodyOptions): MethodDecorator;
export function Patch(r1?: string | IMethodOptions, r2?: IMethodWithBodyOptions): MethodDecorator {
  const route: string = typeof(r1) === 'string' ? r1 : '';
  const options =
    typeof(r1) === 'object'
      ? r1
      : typeof(r2) === 'object'
        ? r2
        : {};

  return HttpMethodAndRoute('PATCH', route, options);
}

import { HTTPMethod } from 'fastify';
import { Class } from 'utility-types';

import { IModule } from '@stockade/core';
import { Domain } from '@stockade/inject';
import { Schema, SchemaWithClassTypes } from '@stockade/schemas';
import { IParameterMetadata, RETURN_DESIGN_TYPE } from '@stockade/utils/metadata';
import { StringTo } from '@stockade/utils/types';

import { AnnotationKeys } from '../annotations/keys';
import { FastifyHookClass } from '../hooks';
import { ControllerClass } from '../types';
import { extractMappedControllerMetadata } from './metadata-utils';

export interface IMappedControllerInfo {
  readonly basePath: string;
}

export interface IMappedControllerBasic {
  readonly [AnnotationKeys.CONTROLLER_INFO]: IMappedControllerInfo;
  readonly [AnnotationKeys.HOOKS]?: ReadonlyArray<FastifyHookClass>;

  readonly [extraKey: string]: any;
}

export interface IMappedController extends IMappedControllerBasic {
  readonly controller: ControllerClass;
  readonly domain: Domain<IModule>;
  readonly endpoints: { [name: string]: IMappedEndpointDetailed };
}

export interface IMethodOptions {
  /**
   * The parseable type (either a decorated class or JSON Schema) that shall be
   * returned. The schema returned can be checked for correctness before being returned
   * to the client.
   *
   * Return schema validation is disabled in the following cases:
   * - debug mode is off
   * - `manualReturn` is true
   * - `returnHeaders['content-type']` is set to any value other than `application/json`
   */
  readonly returnSchema?: any;

  /**
   * Headers that should be attached to the response from this method. Please note that
   * these are being passed directly to Fastify, and Fastify may react based on them
   * (such as content-type coercion).
   *
   * These values _are_ honored if `manualReturn` is true.
   */
  readonly returnHeaders?: { [headerName: string]: string | ReadonlyArray<string> };

  /**
   * When returning cleanly, this return code shall be used.
   *
   * Ignored if `manualReturn` is true.
   */
  readonly returnCode?: number;
  /**
   * This signals to Stockade that you will be taking control of the
   * reply lifecycle from here on out. You must call `reply.send` in
   * your handler method before you return from this method, or Stockade
   * may explode at high speed and demons may fly out of your nose.
   *
   * Many other options don't act as expected if this is set to true. Consult
   * the documentation.
   */
  readonly manualReturn?: boolean;
}

export interface IMethodWithBodyOptions extends IMethodOptions {
  readonly contentType?: string;
}

// spoilers: these are just OAS3
export interface IMappedEndpointParameterBase {
  readonly name: string;
  readonly in: string;
  readonly description?: string;
  readonly required?: boolean;
  readonly deprecated?: boolean;
  readonly style?: string;
  readonly schema?: Schema;
}

export interface IMappedEndpointPathParameter extends IMappedEndpointParameterBase {
  readonly in: 'path';
  readonly required?: true;
  readonly style?: 'simple',
}

export interface IMappedEndpointQueryParameter extends IMappedEndpointParameterBase {
  readonly in: 'query',
  readonly style?: 'form';
}

export type EndpointHeaderName =
  Exclude<string, 'Accept' | 'Content-Type' | 'Authorization' | 'accept' | 'content-type' | 'authorization'>;

export interface IMappedEndpointHeaderParameter extends IMappedEndpointParameterBase {
  readonly name: EndpointHeaderName;
  readonly in: 'header';
  style?: 'simple';
}

// TODO: support cookies
export type MappedEndpointParameter =
  | IMappedEndpointPathParameter
  | IMappedEndpointQueryParameter
  | IMappedEndpointHeaderParameter
  ;

export interface IMappedEndpointRequestBody {
  readonly contentType?: string;
  readonly schema: Schema;
}

export function isMappedEndpointRequestBody(o: any): o is IMappedEndpointRequestBody {
  return o && o.content;
}

export interface IMappedEndpointBasic {
  readonly [AnnotationKeys.ROUTE_METHOD]: HTTPMethod;
  readonly [AnnotationKeys.ROUTE_PATH]: string;
  readonly [AnnotationKeys.HOOKS]?: ReadonlyArray<FastifyHookClass>;
  readonly [AnnotationKeys.ROUTE_OPTIONS]: IMethodOptions | IMethodWithBodyOptions;
  readonly [AnnotationKeys.EXPLICIT_PARAMETERS]?: Array<any>;
  readonly [RETURN_DESIGN_TYPE]?: Class<any>;

  readonly [extraKey: string]: any;
}

export interface IMappedEndpointDetailed extends IMappedEndpointBasic {
  readonly controller: ControllerClass;
  readonly handlerName: string;
  readonly parameters: ReadonlyMap<number, IMappedEndpointParameter>;

  readonly requestBody?: IMappedEndpointRequestBody;
}

export interface IParameterResolver<T = any> {
  readonly friendlyName: string;

  readonly inject: ReadonlyArray<symbol>;
  readonly fn: (...args: Array<any>) => Promise<T>;

  readonly implicitParameterInfo?: MappedEndpointParameter;
  readonly requestBody?: IMappedEndpointRequestBody;

  readonly [extraKey: string]: any;
}

export interface IMappedEndpointParameter extends IParameterMetadata {
  readonly [AnnotationKeys.PARAMETER_RESOLVER]?: IParameterResolver;
  readonly implicitParameterInfo?: MappedEndpointParameter;

  readonly [extraKey: string]: any;
}

export function isMappedControllerBasic(o: any): o is IMappedControllerBasic {
  return o[AnnotationKeys.CONTROLLER_INFO];
}

export function isMappedEndpointBasic(o: any): o is IMappedEndpointBasic {
  return typeof(o[AnnotationKeys.ROUTE_METHOD]) === 'string' && typeof(o[AnnotationKeys.ROUTE_PATH]) === 'string';
}

export function buildMappedControllerInfo(
  controllers: ReadonlyArray<[ControllerClass, Domain<IModule>]>,
): Array<IMappedController> {
  return controllers
    .map(([c, d]) => extractMappedControllerMetadata(c, d));
}

import { HTTPMethod } from 'fastify';
import numeral from 'numeral';
import {
  CallbacksObject,
  ExternalDocumentationObject,
  ParameterObject,
  RequestBodyObject,
  ResponsesObject,
} from 'openapi3-ts';
import { Class } from 'utility-types';

import { IModule } from '@stockade/core';
import { Domain } from '@stockade/inject';
import { Schema } from '@stockade/schemas';
import { IParameterMetadata, RETURN_DESIGN_TYPE } from '@stockade/utils/metadata';
import { StringTo } from '@stockade/utils/types';

import { AnnotationKeys } from '../annotations/keys';
import { FastifyHookClass } from '../hooks';
import { ISecurity } from '../security';
import { ControllerClass } from '../types';

export interface ISecurityAssignment {
  cls: Class<ISecurity<any>>,
  args: StringTo<any>,
}

/**
 * OAS3-related fields that can be applied to either a controller _or_ to an endpoint.
 * If applied to a controller, they will be set for all endpoints in that controller.
 */
export interface IOAS3ControllerOrEndpointInfo {
  /**
   * Categorization tags for endpoints in your OAS3 doc. Controller-level tags will
   * percolate down to endpoints.
   */
  readonly tags?: ReadonlyArray<string>;
  readonly deprecated?: boolean;
}

/**
 * Endpoint-specific OAS3 stuff.
 */
export interface IOAS3EndpointInfo extends IOAS3ControllerOrEndpointInfo {
  readonly tags?: ReadonlyArray<string>;

  /**
   * By default, OAS3 will use your handler name as the operation ID. If you want a
   * custom one, set this.
   */
  readonly operationId?: string;
  readonly summary?: string;
  readonly description?: string;
  /**
   * OAS3 external documentation object, as defined here:
   *
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#externalDocumentationObject
   */
  readonly externalDocs?: ExternalDocumentationObject,
  readonly callbacks?: CallbacksObject;
  /**
   * OAS3 responses object, as defined here:
   *
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md#responsesObject
   *
   * **IMPORTANT:** If you populate this, automatic response object generation (based on
   * inference from your annotations) will be disabled. OAS3 lets you define responses with
   * whatever you want--it's up to you to make sure they're correct!
   */
  readonly responses?: ResponsesObject;

  /**
   * OAS3 request body object. Overrides the automatic syntax hinting derived from
   * `@RequestBody()` parameters, if it exists.
   */
  readonly requestBody?: RequestBodyObject;
}

/**
 * Operational (i.e., non-OAS3, though some may be used by OAS3 when needed) fields that
 * apply to both controllers and endpoints. Any settings in a controller shall apply to
 * all endpoints inside it, unless overwritten.
 */
export interface IControllerOrEndpointBasic {
  readonly [AnnotationKeys.EXPLICIT_PARAMETERS]?: ReadonlyArray<MappedEndpointParameter>;
  readonly [AnnotationKeys.SECURITY]?: ReadonlyArray<ISecurityAssignment>;
}

/**
 * Information provided by the developer in the `@Controller()` decorator's argument.
 */
export interface IMappedControllerInfo extends IOAS3ControllerOrEndpointInfo {
  readonly basePath: string;
}

/**
 * Information applied directly to a controller in the form of decorators. Not to be
 * confused with `IMappedControllerInfo`, which refers strictly to the contents of
 * the `@Controller()` annotation.
 */
export interface IMappedControllerBasic extends IControllerOrEndpointBasic {
  readonly [AnnotationKeys.CONTROLLER_INFO]: IMappedControllerInfo;
  readonly [AnnotationKeys.HOOKS]?: ReadonlyArray<FastifyHookClass>;

  readonly [extraKey: string]: any;
}

/**
 * Stockade will take the `IMappedControllerBasic` and add to it necessary fields,
 * yielding `IMappedController` which is used at runtime.
 */
export interface IMappedController extends IMappedControllerBasic {
  readonly controller: ControllerClass;
  readonly domain: Domain<IModule>;
  readonly endpoints: { [name: string]: IMappedEndpointDetailed };
}

export type MethodReturnByCode = {
  [code: number]: Schema,
  default?: Schema,
};

/**
 * The return type of this endpoint. It can be omitted if you want Stockade to attempt
 * to discover it from the return type of the method, which only works for built-in
 * types (such as `number`) or classes that use `@stockade/schemas` annotations.
 */
export type MethodReturn =
  | false
  | Schema
  | MethodReturnByCode;

export function isMethodReturnByCode(o: any): o is MethodReturnByCode {
  const keys = Object.keys(o);

  return keys.length > 0 && keys.every(k => {
    if (k === 'default') {
      return true;
    }

    const code = numeral(k).value();

    if (!code || isNaN(code)) {
      return false;
    }

    // tslint:disable-next-line: no-magic-numbers
    return (100 <= code && code <= 599);
  });
}


export interface IMethodOptions extends IOAS3EndpointInfo {
  /**
   * The parseable type (either a decorated class or JSON Schema) that shall be
   * returned. The schema returned can be checked for correctness before being returned
   * to the client.
   *
   * Return schema validation is disabled in the following cases:
   * - debug mode is off
   * - `manualReturn` is true
   * - `returnHeaders['content-type']` is set to any value other than `application/json`
   *
   * Whether or not debug mode is on or not, a warning will be registered if this is
   * unspecified and Stockade cannot infer the correct value from the method's return
   * type.
   *
   * You can provide either a single Schema, which will default to the specified
   * `returnCode`, or an object of code->Schema pairs, which map to all response types.
   */
  readonly returns?: MethodReturn;

  /**
   * Headers that should be attached to the response from this method. Please note that
   * these are being passed directly to Fastify, and Fastify may react based on them
   * (such as content-type coercion).
   *
   * These values _are_ honored if `manualReturn` is true.
   */
  readonly returnHeaders?: { [headerName: string]: string | ReadonlyArray<string> };

  /**
   * When returning cleanly, this return code shall be used. If not provided, will
   * default to `200` for everything, _including_ `POST` (unlike some other frameworks).
   * The reason for POSTs being `200` is because `201` buys you into using the
   * `Location` header to point clients at where they can access the resource that
   * that `POST` created and that is a level of HTTP/RFC adherence that basically nobody
   * actually _does_.
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

  /**
   * An (optional) description that shall be used for this endpoint in generated
   * documentation. Stockade will try to do something vaguely intelligent if you
   * don't provide one, but that's on you.
   *
   * TODO: make Stockade do something vaguely intelligent if you don't provide one
   */
  readonly description?: string;
}

export interface IMethodWithBodyOptions extends IMethodOptions {
  readonly contentType?: string;
}

// spoilers: these are just OAS3
export interface IMappedEndpointParameterBase
  extends Pick<
    ParameterObject,
    'name' | 'in' | 'description' | 'required' | 'deprecated' | 'style'
  > {
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

/**
 * `IMappedEndpointBasic` encompasses the decorators that are added to an endpoint as
 * part of normal HTTP stuff.
 */
export interface IMappedEndpointBasic extends IControllerOrEndpointBasic {
  readonly [AnnotationKeys.ROUTE_METHOD]: HTTPMethod;
  readonly [AnnotationKeys.ROUTE_PATH]: string;
  readonly [AnnotationKeys.HOOKS]?: ReadonlyArray<FastifyHookClass>;
  readonly [AnnotationKeys.ROUTE_OPTIONS]: IMethodOptions | IMethodWithBodyOptions;
  readonly [AnnotationKeys.EXPLICIT_PARAMETERS]?: Array<any>;
  readonly [RETURN_DESIGN_TYPE]?: Class<any>;

  readonly [extraKey: string]: any;
}

/**
 * `IMappedEndpointDetailed` contains all of the metadata from `IMappedEndpointBasic`,
 * but folds in information from the controller and default values to provide
 * actionable information for Stockade to use at runtime.
 */
export interface IMappedEndpointDetailed extends IMappedEndpointBasic {
  readonly controller: ControllerClass;
  readonly handlerName: string;
  readonly fullUrlPath: string;
  readonly parameters: ReadonlyMap<number, IMappedEndpointParameter>;
  readonly explicitParameters: ReadonlyArray<MappedEndpointParameter>;
  readonly securityAssignments: ReadonlyArray<ISecurityAssignment>;

  readonly requestBody?: IMappedEndpointRequestBody;
  readonly description: string;
  readonly returnCode: number;
  readonly responses: MethodReturnByCode;
}

/**
 * Every parameter in every endpoint handler must be decorated with an
 * `IParameterResolver` that tells the application what to do in order to
 * create that parameter (so that it may be passed to the user's endpoint
 * handler function).
 */
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


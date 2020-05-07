import { FastifyRequest } from 'fastify';

import { Schema } from '@stockade/schemas';

import { REQUEST } from '../inject-keys';
import {
  EndpointHeaderName,
  IMappedEndpointHeaderParameter,
  IMappedEndpointPathParameter,
  IMappedEndpointQueryParameter,
  IMappedEndpointRequestBody,
  isMappedEndpointRequestBody,
} from '../types/controller-info';
import { ParameterResolver } from './parameter-resolver.decorator';

export { FastifyRequest } from 'fastify';

export type QueryArgs =
  Pick<
    IMappedEndpointQueryParameter,
    'description' | 'required' | 'deprecated' | 'style' | 'schema'
  >;
export type HeaderArgs =
  Pick<
    IMappedEndpointHeaderParameter,
    'description' | 'required' | 'deprecated' | 'style' | 'schema'
  >;
export type PathArgs =
  Pick<
    IMappedEndpointPathParameter,
    'description' | 'required' | 'deprecated' | 'style' | 'schema'
  >;

export type RequestBodyArgs = Schema | IMappedEndpointRequestBody;

export function Request() {
  return ParameterResolver({
    friendlyName: 'Request',
    inject: [REQUEST],
    fn: async (req: FastifyRequest) => req,
  });
}

export function Query(name: string, args: QueryArgs = {}) {
  const implicitParameter: IMappedEndpointQueryParameter = {
    name,
    in: 'query',
    ...args,
  };

  return ParameterResolver({
    friendlyName: 'QueryParameter',
    name,
    inject: [REQUEST],
    fn: (req: FastifyRequest) => req.query[name],
    implicitParameter,
  });
}

export function RequestBody(requestBody?: RequestBodyArgs) {
  return ParameterResolver({
    friendlyName: 'RequestBody',
    inject: [REQUEST],
    fn: (req: FastifyRequest) => req.body,
    requestBody,
  });
}

export function Header(name: EndpointHeaderName, args: HeaderArgs = {}) {
  const implicitParameter: IMappedEndpointHeaderParameter = {
    name,
    in: 'header',
    ...args,
  };

  return ParameterResolver({
    friendlyName: 'HeaderParameter',
    name,
    inject: [REQUEST],
    fn: (req: FastifyRequest) => req.headers[name],
    implicitParameter,
  });
}

export function Path(name: string, args: PathArgs = {}) {
  const implicitParameter: IMappedEndpointPathParameter = {
    name,
    in: 'path',
    ...args,
  };

  return ParameterResolver({
    friendlyName: 'PathParameter',
    name,
    inject: [REQUEST],
    fn: (req: FastifyRequest) => req.params[name],
    implicitParameter,
  });
}

// TODO: support cookies (but fastify doesn't support them internally, so it's custom validation)

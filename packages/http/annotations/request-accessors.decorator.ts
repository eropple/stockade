import { FastifyRequest } from 'fastify';

import { SchemaWithClassTypes } from '@stockade/schemas';

import { REQUEST } from '../inject-keys';
import { ParameterResolver } from './parameter-resolver.decorator';

export interface IRequestAccessorArgsBase {
  schema?: SchemaWithClassTypes;
}

export function Query(queryName: string, args: IRequestAccessorArgsBase) {
  return ParameterResolver({
    friendlyName: 'QueryParameter',
    queryName,
    inject: [REQUEST],
    fn: (req: FastifyRequest) => req.query[queryName],
    ...args,
  });
}

export function RequestBody(args: IRequestAccessorArgsBase) {
  return ParameterResolver({
    friendlyName: 'RequestBody',
    inject: [REQUEST],
    fn: (req: FastifyRequest) => req.body,
    ...args,
  });
}

export function Header(headerName: string, args: IRequestAccessorArgsBase) {
  return ParameterResolver({
    friendlyName: 'HeaderParameter',
    headerName,
    inject: [REQUEST],
    fn: (req: FastifyRequest) => req.headers[headerName],
    ...args,
  });
}

export function Path(pathSegmentName: string, args: IRequestAccessorArgsBase) {
  return ParameterResolver({
    friendlyName: 'PathParameter',
    pathSegmentName,
    inject: [REQUEST],
    fn: (req: FastifyRequest) => req.params[pathSegmentName],
    ...args,
  });
}

// TODO: support cookies (but fastify doesn't support them internally, so it's custom validation)

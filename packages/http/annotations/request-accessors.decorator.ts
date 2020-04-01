import { FastifyRequest } from 'fastify';

import { REQUEST } from '../inject-keys';
import { ParameterResolver } from './parameter-resolver.decorator';

export interface IRequestAccessorArgsBase {
  schema: any;
}

export function Query(name: string, args: IRequestAccessorArgsBase) {
  return ParameterResolver({
    friendlyName: 'QueryParameter',
    inject: [REQUEST],
    fn: (req: FastifyRequest) => req.query[name],
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

export function Header(name: string, args: IRequestAccessorArgsBase) {
  return ParameterResolver({
    friendlyName: 'HeaderParameter',
    inject: [REQUEST],
    fn: (req: FastifyRequest) => req.headers[name],
    ...args,
  });
}

export function Path(segmentName: string, args: IRequestAccessorArgsBase) {
  return ParameterResolver({
    friendlyName: 'PathParameter',
    inject: [REQUEST],
    fn: (req: FastifyRequest) => req.params[segmentName],
    ...args,
  });
}

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ServerResponse } from 'http';
import { Class } from 'utility-types';

import { IMappedEndpointDetailed } from './facet/controller-info';

export type ControllerClass =
  & Class<any>
  & {
    onRegisterStart?(fastify: FastifyInstance): void,
    onRegisterEnd?(fastify: FastifyInstance): void,

    onEndpointRegisterStart?(
      fastify: FastifyInstance, handlerName: string, endpointInfo: IMappedEndpointDetailed): void,
    onEndpointRegisterEnd?(
      fastify: FastifyInstance,
      handlerName: string,
      endpointInfo: IMappedEndpointDetailed,
    ): void,
  };

export type StockadeHttpRequest = FastifyRequest;
export type StockadeHttpReply = FastifyReply<ServerResponse>;


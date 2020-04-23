import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ServerResponse } from 'http';
import { Class } from 'utility-types';

import { PromiseOr, Resolver } from '@stockade/inject';

import { IMappedEndpointDetailed } from './facet/controller-info';

export type ControllerClass =
  & Class<any>
  & {
    onRegisterStart?(
      fastify: FastifyInstance,
      resolver: Resolver,
    ): PromiseOr<void>,
    onRegisterEnd?(
      fastify: FastifyInstance,
      resolver: Resolver,
    ): PromiseOr<void>,

    onEndpointRegisterStart?(
      fastify: FastifyInstance,
      resolver: Resolver,
      handlerName: string,
      endpointInfo: IMappedEndpointDetailed,
    ): PromiseOr<void>,
    onEndpointRegisterEnd?(
      fastify: FastifyInstance,
      resolver: Resolver,
      handlerName: string,
      endpointInfo: IMappedEndpointDetailed,
    ): PromiseOr<void>,
  };

export type StockadeHttpRequest = FastifyRequest;
export type StockadeHttpReply = FastifyReply<ServerResponse>;

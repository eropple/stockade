import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import * as http from 'http';

/**
 * Implements a hook that is triggered when a request is initially received
 */
export interface IOnRequest {
  onRequest(
    req: FastifyRequest,
    reply: FastifyReply<http.ServerResponse>,
    done: (err?: Error) => void,
  ): Promise<any>;
}
/**
 * Implements a hook that is triggered after the onRequest hook and middlewares,
 * but before body parsing
 */
export interface IPreParsing {
  preParsing(
    req: FastifyRequest,
    reply: FastifyReply<http.ServerResponse>,
  ): Promise<any>;
}

/**
 * Implements a hook that is triggered after the onRequest, middlewares, and
 * body parsing, but before the validation
 */
export interface IPreValidation {
  preValidation(
    req: FastifyRequest,
    reply: FastifyReply<http.ServerResponse>,
  ): Promise<any>;
}

/**
 * Implements a hook that is fired after a request is processed, but before the
 * response is serialized hook
 */
export interface IPreSerialization {
  preSerialization(
    req: FastifyRequest,
    reply: FastifyReply<http.ServerResponse>,
    payload: unknown,
    done: (err?: Error) => void,
  ): Promise<any>;
}

/**
 * Implements a hook that is fired if `reply.send` is invoked with an Error
 */
export interface IOnError {
  onError(
    instance: FastifyInstance,
  ): Promise<void>;
}

/**
 * Implements a hook that is fired after a request is processed, but before the
 * "onResponse" hook
 */
export interface IOnSend {
  onSend(
    instance: FastifyInstance,
  ): Promise<void>;
}

/**
 * Implements a hook that is called when a response is about to be sent to a
 * client
 */
export interface IOnResponse {
  onResponse(
    req: FastifyRequest,
    reply: FastifyReply<http.ServerResponse>,
  ): Promise<any>;
}

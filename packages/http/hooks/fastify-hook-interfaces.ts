import {
  FastifyError,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import * as http from 'http';

/**
 * Implements a hook that is triggered when a request is initially received
 */
export interface IOnRequestHook {
  onRequest(
    req: FastifyRequest,
    reply: FastifyReply<http.ServerResponse>,
  ): Promise<any>;
}
/**
 * Implements a hook that is triggered after the onRequest hook and middlewares,
 * but before body parsing
 */
export interface IPreParsingHook {
  preParsing(
    req: FastifyRequest,
    reply: FastifyReply<http.ServerResponse>,
  ): Promise<any>;
}

/**
 * Implements a hook that is triggered after the onRequest, middlewares, and
 * body parsing, but before the validation
 */
export interface IPreValidationHook {
  preValidation(
    req: FastifyRequest,
    reply: FastifyReply<http.ServerResponse>,
  ): Promise<any>;
}

export interface IPreHandlerHook {
  preHandler(
    req: FastifyRequest,
    reply: FastifyReply<http.ServerResponse>,
  ): Promise<any>;
}

/**
 * Implements a hook that is fired after a request is processed, but before the
 * response is serialized hook
 */
export interface IPreSerializationHook {
  preSerialization(
    req: FastifyRequest,
    reply: FastifyReply<http.ServerResponse>,
    payload: unknown,
  ): Promise<any>;
}

/**
 * Implements a hook that is fired if `reply.send` is invoked with an Error
 */
export interface IOnErrorHook {
  onError(
    req: FastifyRequest,
    reply: FastifyReply<http.ServerResponse>,
    error: FastifyError,
  ): Promise<void>;
}

/**
 * Implements a hook that is fired after a request is processed, but before the
 * "onResponse" hook
 */
export interface IOnSendHook {
  onSend(
    req: FastifyRequest,
    reply: FastifyReply<http.ServerResponse>,
    payload: unknown,
  ): Promise<void>;
}

/**
 * Implements a hook that is called when a response is about to be sent to a
 * client
 */
export interface IOnResponseHook {
  onResponse(
    req: FastifyRequest,
    reply: FastifyReply<http.ServerResponse>,
  ): Promise<any>;
}

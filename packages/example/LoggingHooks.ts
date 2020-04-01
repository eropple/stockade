import {
  FastifyError,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import * as http from 'http';

import {
  IOnErrorHook,
  IOnRequestHook,
  IOnResponseHook,
  IOnSendHook,
  IPreHandlerHook,
  IPreParsingHook,
  IPreSerializationHook,
  IPreValidationHook,
  REQUEST,
} from '@stockade/http';
import { Inject } from '@stockade/inject';

export class LoggingHooks
  implements
    IOnRequestHook,
    IPreParsingHook,
    IPreHandlerHook,
    IPreValidationHook,
    IPreSerializationHook,
    IOnErrorHook,
    IOnSendHook,
    IOnResponseHook {

  constructor(
    @Inject(REQUEST) readonly request: FastifyRequest,
  ) {
    console.log('LOGGINGHOOKS INSTANTIATED');
  }

  async onRequest(req: FastifyRequest, reply: FastifyReply<http.ServerResponse>) {
    console.log('onRequest');
  }

  async preParsing(req: FastifyRequest, reply: FastifyReply<http.ServerResponse>) {
    console.log('preParsing');
  }

  async preValidation(req: FastifyRequest, reply: FastifyReply<http.ServerResponse>) {
    console.log('preValidation');
  }

  async preHandler(req: FastifyRequest, reply: FastifyReply<http.ServerResponse>) {
    console.log('preHandler');
  }

  async preSerialization(
    req: FastifyRequest,
    reply: FastifyReply<http.ServerResponse>,
    payload: unknown,
  ): Promise<void> {
    console.log('preSerialization');
  }

  async onError(
    req: FastifyRequest,
    reply: FastifyReply<http.ServerResponse>,
    error: FastifyError,
  ): Promise<void> {
    console.log('onError');
  }

  async onSend(
    req: FastifyRequest,
    reply: FastifyReply<http.ServerResponse>,
    payload: unknown,
  ): Promise<void> {
    console.log('onSend');
  }

  async onResponse(req: FastifyRequest, reply: FastifyReply<http.ServerResponse>): Promise<void> {
    console.log('onResponse');
  }
}

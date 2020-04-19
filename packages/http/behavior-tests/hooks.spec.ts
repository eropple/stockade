import { FastifyError, FastifyReply } from 'fastify';

import { Runner, App } from '@stockade/core';
import { Inject } from '@stockade/inject';

import * as http from 'http';

import { Controller, FastifyRequest, Get, Post } from '../annotations';
import { HttpApp } from '../builder';
import { httpFacet } from '../facet';
import {
  IOnErrorHook,
  IOnRequestHook,
  IOnResponseHook,
  IOnSendHook,
  IPreHandlerHook,
  IPreParsingHook,
  IPreSerializationHook,
  IPreValidationHook,
} from '../hooks';
import { HttpTester } from '../HttpTester';
import { REQUEST } from '../inject-keys';

describe('hooks tests', () => {
  let tester!: HttpTester;
  let hooksHit!: Array<string>;

  beforeEach(() => hooksHit = []);

  beforeAll(() => {
    const runner = new Runner({
      appSpec:
        App()
          .apply(
            HttpApp()
              .controllers(HooksTestController)
              .hooks(TestLoggingHooks)
            ),
      facets: [
        httpFacet({ fastify: { listen: { port: 0 } } }),
      ],
      options: { logging: { level: 'warn' } },
    });

    tester = new HttpTester(runner);
  });

  @Controller()
  class HooksTestController {
    @Post('successful')
    successful() {
      return { bar: 20 };
    }

    @Post('failure')
    failure() {
      throw new Error('unhandled exception in the frobozz cluster');
    }
  }

  class TestLoggingHooks implements
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
  }

  async onRequest(req: FastifyRequest, reply: FastifyReply<http.ServerResponse>) {
    hooksHit.push('onRequest');
  }

  async preParsing(req: FastifyRequest, reply: FastifyReply<http.ServerResponse>) {
    hooksHit.push('preParsing');
  }

  async preValidation(req: FastifyRequest, reply: FastifyReply<http.ServerResponse>) {
    hooksHit.push('preValidation');
  }

  async preHandler(req: FastifyRequest, reply: FastifyReply<http.ServerResponse>) {
    hooksHit.push('preHandler');
  }

  async preSerialization(
    req: FastifyRequest,
    reply: FastifyReply<http.ServerResponse>,
    payload: unknown,
  ): Promise<void> {
    hooksHit.push('preSerialization');
  }

  async onError(
    req: FastifyRequest,
    reply: FastifyReply<http.ServerResponse>,
    error: FastifyError,
  ): Promise<void> {
    hooksHit.push('onError');
  }

  async onSend(
    req: FastifyRequest,
    reply: FastifyReply<http.ServerResponse>,
    payload: unknown,
  ): Promise<void> {
    hooksHit.push('onSend');
  }

  async onResponse(req: FastifyRequest, reply: FastifyReply<http.ServerResponse>): Promise<void> {
    hooksHit.push('onResponse');
  }
}

  it('should run all hooks in order on a successful HTTP request', async () => {
    const resp = await tester.inject({ method: 'POST', url: '/successful' });

    expect(resp.json()).toMatchObject({ bar: 20 });
    expect(hooksHit).toEqual([
      'onRequest',
      'preParsing',
      'preValidation',
      'preHandler',
      'preSerialization',
      'onSend',
      'onResponse',
    ]);
  });

  it('should run all hooks in order on a failed HTTP request', async () => {
    const resp = await tester.inject({ method: 'POST', url: '/failure' });

    expect(resp.statusCode).toBe(500);
    expect(hooksHit).toEqual([
      'onRequest',
      'preParsing',
      'preValidation',
      'preHandler',
      'onError',
      'onSend',
      'onResponse',
    ]);
  });
});

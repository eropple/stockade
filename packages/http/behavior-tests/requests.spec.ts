import { FastifyError, FastifyReply } from 'fastify';

import { Runner, App } from '@stockade/core';
import { Inject } from '@stockade/inject';

import * as http from 'http';

import { Controller, FastifyRequest, Get, Post, Delete, Put, Patch } from '../annotations';
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
              .controllers(RequestsTestController)
            ),
      facets: [
        httpFacet({ fastify: { listen: { port: 0 } } }),
      ],
      options: { logging: { level: 'warn' } },
    });

    tester = new HttpTester(runner);
  });

  @Controller()
  class RequestsTestController {
    @Get()
    methodGet() {
      return { method: 'get' };
    }

    @Post()
    methodPost() {
      return { method: 'post' };
    }

    @Delete()
    methodDelete() {
      return { method: 'delete' };
    }

    @Put()
    methodPut() {
      return { method: 'put' };
    }

    @Patch()
    methodPatch() {
      return { method: 'patch' };
    }
  }

  it('should handle GET requests', async () => {
    const resp = await tester.inject({ method: 'GET', url: '/' });
    expect(resp.json()).toMatchObject({ method: 'get' });
  });

  it('should handle POST requests', async () => {
    const resp = await tester.inject({ method: 'POST', url: '/' });
    expect(resp.json()).toMatchObject({ method: 'post' });
  });

  it('should handle DELETE requests', async () => {
    const resp = await tester.inject({ method: 'DELETE', url: '/' });
    expect(resp.json()).toMatchObject({ method: 'delete' });
  });

  it('should handle PUT requests', async () => {
    const resp = await tester.inject({ method: 'PUT', url: '/' });
    expect(resp.json()).toMatchObject({ method: 'put' });
  });

  it('should handle PATCH requests', async () => {
    const resp = await tester.inject({ method: 'PATCH', url: '/' });
    expect(resp.json()).toMatchObject({ method: 'patch' });
  });
});

import { OpenAPIObject } from 'openapi3-ts';
import { inspect } from 'util';

import { App, Runner } from '@stockade/core';
import { Controller, HttpApp, httpFacet, HttpTester } from '@stockade/http';
import { bind, SINGLETON } from '@stockade/inject';
import { Model, Prop } from '@stockade/schemas';

import { Get, Header, Path, Post, Query, RequestBody } from '../../annotations';
import { OAS3_CONFIG, OpenAPIConfig } from '../config';
import { OAS3Module } from '../oas3.module';

@Model()
class RBody {
  @Prop()
  foo!: number;
}

@Model()
class ResponseWithFields {
  @Prop()
  foo!: string;

  @Prop()
  bar!: Date;
}

@Controller({ tags: ['a'] })
class AController {
  @Get()
  aGet(): number {
    return 5;
  }

  @Get('with-route')
  aRouteGet(): string {
    return 'yo';
  }

  @Post('request-body')
  aRequestBody(@RequestBody() body: RBody): number {
    return body.foo;
  }
}

@Controller({ basePath: 'b', tags: ['b'] })
class BController {
  @Get()
  bGet(): Date {
    return new Date();
  }

  @Get('complex-object', { tags: ['weird'] })
  bComplexObjectGet(): ResponseWithFields {
    return { foo: 'hello', bar: new Date() };
  }
}

@Controller({ basePath: 'p' })
class ParameterizedController {
  @Get('query-params')
  query(
    @Query('req') reqParam: number,
    @Query('opt', { required: false }) optParam: string,
  ): string {
    return `${reqParam}-${optParam || 'NONE'}`;
  }

  @Get('path-params/:req')
  path(
    @Path('req') reqParam: number,
  ): string {
    // tslint:disable-next-line: no-magic-numbers
    return `${reqParam.toString().padStart(10, '0')}`;
  }

  @Get('header-params')
  header(
    @Header('req') reqParam: number,
    @Header('opt', { required: false }) optParam: string
  ): string {
    return `${reqParam}-${optParam || 'NONE'}`;
  }
}

describe('oas3 controller behavior tests', () => {
  let runner: Runner;
  let tester: HttpTester;
  let doc: OpenAPIObject;

  beforeAll(async () => {
    runner = new Runner({
      appSpec:
        App()
          .provide(
            bind(OAS3_CONFIG).in(SINGLETON).toValue<OpenAPIConfig>({
              info: {
                title: 'hello',
                version: '0.1.0',
              },
              path: 'openapi.json',
            })
          )
          .children(OAS3Module)
          .apply(
            HttpApp()
              .controllers(AController, BController, ParameterizedController),
            ),
      facets: [
        httpFacet({ fastify: { listen: { port: 0 } } }),
      ],
      options: { logging: { level: 'warn' } },
    });

    tester = new HttpTester(runner);

    doc = (await tester.inject({ url: '/openapi.json' })).json() as OpenAPIObject;
  });

  it('should describe in OAS3 a basic GET', async () => {
      expect(doc).toMatchObject({
        paths: {
          '/': {
            get: {
              operationId: 'aGet',
              tags: ['a'],
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: { type: 'number' }
                    },
                  },
                },
              },
            },
          },
          '/with-route': {
            get: {
              operationId: 'aRouteGet',
              tags: ['a'],
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: { type: 'string' }
                    },
                  },
                },
              },
            },
          },
          '/b': {
            get: {
              operationId: 'bGet',
              tags: ['b'],
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: { type: 'string', format: 'date' }
                    },
                  },
              },
              },
            },
          },
          '/b/complex-object': {
            get: {
              operationId: 'bComplexObjectGet',
              tags: ['b', 'weird'],
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: { $ref: `#/components/schemas/${ResponseWithFields.name}` },
                    },
                  },
                },
              },
            },
          },
        },
    });
  });

  it('should represent a request body', async () => {
    const aRequestBody = doc.paths['/request-body'].post;

    expect(aRequestBody).toMatchObject({
      operationId: 'aRequestBody',
      responses: {
        200: {
          content: {
            'application/json': { schema: { type: 'number' } },
          },
        },
      },
    });
  });

  it('should represent query parameters and optional query parameters alike', async () => {
    const queries = doc.paths['/p/query-params'].get;

    expect(queries).toMatchObject({
      operationId: 'query',
      tags: ['default'],
      parameters: [
        { name: 'req', in: 'query', schema: { type: 'number' } },
        { name: 'opt', in: 'query', required: false, schema: { type: 'string'} },
      ],
      responses: {
        200: {
          content: {
            'application/json': {
              schema: { type: 'string' },
            },
          },
        },
      },
    });
  });

  it('should represent header parameters and optional header parameters alike', async () => {
    const queries = doc.paths['/p/header-params'].get;

    expect(queries).toMatchObject({
      operationId: 'header',
      tags: ['default'],
      parameters: [
        { name: 'req', in: 'header', schema: { type: 'number' } },
        { name: 'opt', in: 'header', required: false, schema: { type: 'string'} },
      ],
      responses: {
        200: {
          content: {
            'application/json': {
              schema: { type: 'string' },
            },
          },
        },
      },
    });
  });

  it('should represent path parameters', async () => {
    const path = doc.paths['/p/path-params/{req}'].get;

    expect(path).toMatchObject({
      operationId: 'path',
      tags: ['default'],
      parameters: [
        { name: 'req', in: 'path', schema: { type: 'number' } },
      ],
      responses: {
        200: {
          content: {
            'application/json': {
              schema: { type: 'string' },
            },
          },
        },
      },
    });
  });
});

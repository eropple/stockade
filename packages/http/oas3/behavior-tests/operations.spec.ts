import { OpenAPIObject } from 'openapi3-ts';
import { inspect } from 'util';

import { App, Runner } from '@stockade/core';
import { Controller, HttpApp, httpFacet, HttpTester } from '@stockade/http';
import { bind, SINGLETON } from '@stockade/inject';
import { Model, Prop } from '@stockade/schemas';

import { Get, Post, RequestBody } from '../../annotations';
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

@Controller()
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

@Controller({ basePath: 'b' })
class BController {
  @Get()
  bGet(): Date {
    return new Date();
  }

  @Get('complex-object')
  bComplexObjectGet(): ResponseWithFields {
    return { foo: 'hello', bar: new Date() };
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
              .controllers(AController, BController),
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
              tags: ['default'],
              responses: {
                200: { type: 'number' },
              },
            },
          },
          '/with-route': {
            get: {
              operationId: 'aRouteGet',
              tags: ['default'],
              responses: {
                200: { type: 'string' },
              },
            },
          },
          '/b': {
            get: {
              operationId: 'bGet',
              tags: ['default'],
              responses: {
                200: { type: 'string', format: 'date' },
              },
            },
          },
          '/b/complex-object': {
            get: {
              operationId: 'bComplexObjectGet',
              tags: ['default'],
              responses: {
                200: { $ref: `#/components/schemas/${ResponseWithFields.name}` },
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
        201: { type: 'number' },
      },
    });
  });
})

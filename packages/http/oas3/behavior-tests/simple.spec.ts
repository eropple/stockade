import { App, Runner } from '@stockade/core';
import { bind, SINGLETON } from '@stockade/inject';

import { Controller, Get } from '../../annotations';
import { httpFacet } from '../../facet';
import { HttpApp } from '../../http-builder';
import { HttpTester } from '../../HttpTester';
import { OAS3_CONFIG, OpenAPIConfig } from '../config';
import { OAS3Module } from '../oas3.module';

describe('oas3 trivial behavior tests', () => {
  it('should create and validate an empty oas3 document', async () => {
    const runner = new Runner({
      appSpec:
        App()
          .provide(
            bind(OAS3_CONFIG).in(SINGLETON).toValue<OpenAPIConfig>({
              info: {
                title: 'hello',
                version: '0.1.0',
              }
            })
          )
          .children(OAS3Module)
          .apply(
            HttpApp()
            ),
      facets: [
        httpFacet({ fastify: { listen: { port: 0 } } }),
      ],
      options: { logging: { level: 'warn' } },
    });

    const tester = new HttpTester(runner);

    const resp = await tester.inject({ url: '/openapi.json' })
    expect(resp.json()).toMatchObject({
      openapi: '3.1',
      info: { title: 'hello', version: '0.1.0' },
      paths: {}
    });
  });

  it('should allow a custom OAS3 JSON path', async () => {
    const runner = new Runner({
      appSpec:
        App()
          .provide(
            bind(OAS3_CONFIG).in(SINGLETON).toValue<OpenAPIConfig>({
              info: {
                title: 'hello',
                version: '0.1.0',
              },
              path: 'qwop.json'
            })
          )
          .children(OAS3Module)
          .apply(
            HttpApp()
            ),
      facets: [
        httpFacet({ fastify: { listen: { port: 0 } } }),
      ],
      options: { logging: { level: 'warn' } },
    });

    const tester = new HttpTester(runner);

    // implicitly tests to make sure a leading `/` is safe.
    const resp = await tester.inject({ url: '/qwop.json' })
    expect(resp.json()).toMatchObject({
      openapi: '3.1',
      info: { title: 'hello', version: '0.1.0' },
      paths: {}
    });
  });

  it('should not serve OAS3 when disabled', async () => {
    const runner = new Runner({
      appSpec:
        App()
          .provide(
            bind(OAS3_CONFIG).in(SINGLETON).toValue<OpenAPIConfig>({
              info: {
                title: 'hello',
                version: '0.1.0',
              },
              disabled: true,
            })
          )
          .children(OAS3Module)
          .apply(
            HttpApp()
            ),
      facets: [
        httpFacet({ fastify: { listen: { port: 0 } } }),
      ],
      options: { logging: { level: 'warn' } },
    });

    const tester = new HttpTester(runner);

    const resp = await tester.inject({ url: '/openapi.json' })
    // tslint:disable-next-line: no-magic-numbers
    expect(resp.statusCode).toBe(404);
  });

  it('should allow custom data from modifyDocFn', async () => {
    const runner = new Runner({
      appSpec:
        App()
          .provide(
            bind(OAS3_CONFIG).in(SINGLETON).toValue<OpenAPIConfig>({
              info: {
                title: 'hello',
                version: '0.1.0',
              },
              modifyDocFn: (doc) => {
                doc['x-test'] = true;
              }
            })
          )
          .children(OAS3Module)
          .apply(HttpApp()),
      facets: [
        httpFacet({ fastify: { listen: { port: 0 } } }),
      ],
      options: { logging: { level: 'warn' } },
    });

    const tester = new HttpTester(runner);

    const resp = await tester.inject({ url: '/openapi.json' })
    expect(resp.json()).toMatchObject({
      openapi: '3.1',
      info: { title: 'hello', version: '0.1.0' },
      paths: {},
      'x-test': true,
    });
  });

  it('should allow custom data from modifyEndpointFn', async () => {
      @Controller()
      class AController {
        @Get()
        // tslint:disable-next-line: prefer-function-over-method
        myGet(): number {
          // tslint:disable-next-line: no-magic-numbers
          return 5;
        }
      }

    const runner = new Runner({
      appSpec:
        App()
          .provide(
            bind(OAS3_CONFIG).in(SINGLETON).toValue<OpenAPIConfig>({
              info: {
                title: 'hello',
                version: '0.1.0',
              },
              modifyEndpointFn: (operation, _controllerInfo, _endpointInfo) => {
                operation['x-test']=  true;
              },
            })
          )
          .children(OAS3Module)
          .apply(
            HttpApp()
              .controllers(AController),
          ),
      facets: [
        httpFacet({ fastify: { listen: { port: 0 } } }),
      ],
      options: { logging: { level: 'warn' } },
    });

    const tester = new HttpTester(runner);

    const resp = await tester.inject({ url: '/openapi.json' })
    expect(resp.json()).toMatchObject({
      openapi: '3.1',
      info: { title: 'hello', version: '0.1.0' },
      paths: {
        '/': {
          get: {
            'x-test': true,
          },
        }
      },
    });
  });
});

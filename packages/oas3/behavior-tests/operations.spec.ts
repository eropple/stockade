import { OpenAPIObject } from 'openapi3-ts';

import { App, Runner } from '@stockade/core';
import { Controller, HttpApp, httpFacet, HttpTester } from '@stockade/http';
import { bind, SINGLETON } from '@stockade/inject';

import { OAS3_CONFIG, OpenAPIConfig } from '../config';
import { OAS3Module } from '../oas3.module';

@Controller()
class AController {

}

@Controller({ basePath: 'b' })
class BController {

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
})

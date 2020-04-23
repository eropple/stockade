import { App, Runner } from '@stockade/core';
import { HttpApp, httpFacet, HttpTester } from '@stockade/http';

import { OAS3Module } from '../oas3.module';

describe('oas3 behavior tests', () => {
  it('should create and validate an empty oas3 document', () => {
    const runner = new Runner({
      appSpec:
        App()
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
  });
});

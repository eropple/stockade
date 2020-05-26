import { App, Runner } from '@stockade/core';
import { Inject } from '@stockade/inject';

import { Controller, FastifyRequest, Get } from '../annotations';
import { Security } from '../annotations/security.decorator';
import { HttpApp, httpFacet, HttpStatus, HttpTester } from '../index';
import { REQUEST } from '../inject-keys';
import { ISecurity, SecurityOutcome } from '../security';

describe('securities', () => {
  function securityForHeader(headerName: string, headerText: string): ISecurity {
    return {
      name: `has-header-${headerName.toLowerCase()}`,
      inject: [REQUEST],
      fn: async (req: FastifyRequest) => {
        const header = req.headers[headerName];

        console.log(headerName, header, headerText)
        if (!header) {
          return SecurityOutcome.UNRECOGNIZED;
        }


        return header === headerText ? SecurityOutcome.OK : SecurityOutcome.FORBIDDEN;
      }
    };
  }

  @Controller()
  class TestController {
    @Get()
    @Security(securityForHeader('x-test-header', 'hello'))
    single() {
      return { ok: true };
    }

    @Get('/multi')
    @Security(securityForHeader('x-test-header', 'hello'))
    @Security(securityForHeader('x-test-header-2', 'hello'))
    multi() {
      return { ok: true };
    }
  }

  let tester!: HttpTester;

  beforeAll(() => {
    const runner = new Runner({
      appSpec:
        App()
          .apply(
            HttpApp()
              .controllers(TestController)
            ),
      facets: [
        httpFacet({ fastify: { listen: { port: 0 } } }),
      ],
      options: { logging: { level: 'warn' } },
    });

    tester = new HttpTester(runner);
  });

  it('should pass a security', async () => {
    const resp = await tester.inject({
      method: 'GET',
      url: '/',
      headers: {
        'x-test-header': 'hello',
      },
    });
    expect(resp.statusCode).toBe(HttpStatus.OK);
    expect(resp.json()).toMatchObject({ ok: true });
  });

  it('should pass if any securities are valid and none are forbidden', async () => {
    const resp = await tester.inject({
      method: 'GET',
      url: '/multi',
      headers: {
        'x-test-header-2': 'hello',
      },
    });
    expect(resp.statusCode).toBe(HttpStatus.OK);
    expect(resp.json()).toMatchObject({ ok: true });
  });

  it('should 403 a security if one returns forbidden (in order)', async () => {
    const resp = await tester.inject({
      method: 'GET',
      url: '/multi',
      headers: {
        'x-test-header': 'derp',
      },
    });
    expect(resp.statusCode).toBe(HttpStatus.FORBIDDEN);
  });

  it('should 401 a security if none return OK or forbidden', async () => {
    const resp = await tester.inject({
      method: 'GET',
      url: '/multi',
      headers: {
      },
    });
    expect(resp.statusCode).toBe(HttpStatus.UNAUTHORIZED);
  });
});

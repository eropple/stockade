import { App, Runner } from '@stockade/core';
import { Model, Prop } from '@stockade/schemas';

import { Controller, Delete, Get, Patch, Post, Put } from '../annotations';
import { httpFacet } from '../facet';
import { HttpApp } from '../http-builder';
import { HttpTester } from '../HttpTester';

@Model()
class MethodObject {
  @Prop()
  method!: string;
}

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
    methodGet(): MethodObject {
      return { method: 'get' };
    }

    @Post()
    methodPost(): MethodObject {
      return { method: 'post' };
    }

    @Delete()
    methodDelete(): MethodObject {
      return { method: 'delete' };
    }

    @Put()
    methodPut(): MethodObject {
      return { method: 'put' };
    }

    @Patch()
    methodPatch(): MethodObject {
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

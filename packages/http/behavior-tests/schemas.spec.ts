// tslint:disable: no-magic-numbers
import { App, AppSpecBuilder, Runner } from '@stockade/core';
import { Controller, FastifyRequest, Get, HttpApp, httpFacet, Path, Post, Query, Request, RequestBody } from '@stockade/http';
import { Model, Prop } from '@stockade/schemas';

import { HttpTester } from '../HttpTester';

@Model()
class RBody {
  @Prop()
  foo!: number;

  @Prop()
  baz!: string;
}

@Controller()
class TestController {
  @Get('path-args/:bar')
  pathGet(
    @Path('bar') bar: number,
  ) {
    return { bar };
  }

  @Get('query-args')
  queryGet(
    @Query('baz') baz: number,
  ) {
    return { baz };
  }

  @Get('query-optional')
  queryOptionalGet(
    @Query('baz', { required: false }) baz: number,
  ) {
    return { baz, other: 'yes' };
  }

  @Get('no-args')
  noArgsGet() {
    return { hello: 'world' };
  }

  @Post('rbody-test')
  requestBodyTest(
    @RequestBody(RBody) body: RBody,
  ) {
    return body;
  }
}


describe('schemas and in/out parameters', () => {
  let tester!: HttpTester;

  beforeAll(() => {
    const runner = new Runner({
      appSpec:
        App()
          .apply(HttpApp().controllers(TestController)),
      facets: [
        httpFacet({ fastify: { listen: { port: 0 } } }),
      ],
      options: { logging: { level: 'warn' } },
    });

    tester = new HttpTester(runner);
  });

  it('should handle the no-arg case', async () => {
    const res = await tester.inject({ method: 'GET', url: '/no-args' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ hello: 'world' });
  });

  it('should coerce correct path arguments', async () => {
    const res = await tester.inject({ method: 'GET', url: '/path-args/37' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ bar: 37 });
  });

  it('should reject bad path arguments', async () => {
    const res = await tester.inject({ method: 'GET', url: '/path-args/badarg' });
    // this is a little fragile but if ajv changes these, we'll deal with it.
    expect(res.json().message).toBe('params.bar should be number');
    expect(res.statusCode).toBe(400);
  });

  it('should coerce correct query arguments', async () => {
    const res = await tester.inject({ method: 'GET', url: '/query-args', query: { baz: 37 } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ baz: 37 });
  });

  it('should not fail on optional query arguments', async () => {
    const res = await tester.inject({ method: 'GET', url: '/query-optional'});
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ other: 'yes' });
  });

  it('should reject bad query arguments', async () => {
    const res = await tester.inject({ method: 'GET', url: '/query-args', query: { baz: 'bad' } });
    // this is a little fragile but if ajv changes these, we'll deal with it.
    expect(res.json().message).toBe('querystring.baz should be number');
    expect(res.statusCode).toBe(400);
  });

  it('should coerce correct simple request bodies', async () => {
    const res = await tester.inject({
      method: 'POST', url: '/rbody-test',
      headers: { 'content-type': 'application/json' },
      payload: { foo: '37', baz: 'orange' },
    });

    expect(res.json()).toMatchObject({ foo: 37, baz: 'orange' });
    expect(res.statusCode).toBe(200);
  });

  it('should reject bad simple request bodies', async () => {
    const res = await tester.inject({
      method: 'POST', url: '/rbody-test',
      headers: { 'content-type': 'application/json' },
      payload: { foo: 'rectangle', baz: 'orange' },
    });

    expect(res.json().message).toBe('body.foo should be number');
    expect(res.statusCode).toBe(400);
  });
});

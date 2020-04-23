// tslint:disable: no-magic-numbers
import { App, AppSpecBuilder, Runner } from '@stockade/core';
import { Model, Prop } from '@stockade/schemas';

import { Controller, Get, Header, Path, Post, Query, RequestBody } from '../annotations';
import { HttpApp } from '../builder';
import { httpFacet } from '../facet';
import { HttpTester } from '../HttpTester';

@Model()
class RBody {
  @Prop()
  foo!: number;

  @Prop()
  baz!: string;
}

@Controller()
class SchemasTestController {
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

  @Get('header-args')
  headerGet(
    @Header('my-header') headerValue: number,
  ) {
    return { value: headerValue };
  }

  @Get('header-args/optional')
  headerOptionalGet(
    @Header('my-header', { schema: Number, required: false }) headerValue?: number,
  ) {
    return { value: headerValue, other: 'yes' };
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

  @Post('request-body-test-alt')
  requestBodyAlt(
    @RequestBody({
      type: 'object',
      properties: {
        hello: { type: 'string' },
      }
    }) body: { hello: string },
  ) {
    return { value: body.hello };
  }
}


describe('schemas and in/out parameters', () => {
  let tester!: HttpTester;

  beforeAll(() => {
    const runner = new Runner({
      appSpec:
        App()
          .apply(HttpApp().controllers(SchemasTestController)),
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

  it('should coerce correct header arguments', async () => {
    const res = await tester.inject({ method: 'GET', url: '/header-args', headers: { 'my-header': 37 } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ value: 37 });
  });

  it('should reject bad header arguments', async () => {
    const res = await tester.inject({ method: 'GET', url: '/header-args', headers: { 'my-header': 'moop' } });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBe('headers[\'my-header\'] should be number');
  });

  it('should not fail on optional header arguments', async () => {
    const res = await tester.inject({ method: 'GET', url: '/header-optional'});
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ other: 'yes' });
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

  it('should handle JSON Schema request bodies', async () => {
    const res = await tester.inject({
      method: 'POST', url: '/request-body-test-alt',
      headers: { 'content-type': 'application/json' },
      payload: { hello: 'world' },
    });

    expect(res.json()).toMatchObject({ value: 'world' });
    expect(res.statusCode).toBe(200);
  });
});

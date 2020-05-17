import { App, AppSpecBuilder, Runner } from '@stockade/core';
import { Model, Prop } from '@stockade/schemas';

import { Controller, Get, Header, Path, Post, Query, RequestBody } from '../annotations';
import { httpFacet } from '../facet';
import { HttpApp } from '../http-builder';
import { HttpStatus } from '../http-statuses';
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
  @Get('path-args/:bar', { returns: false })
  pathGet(
    @Path('bar') bar: number,
  ) {
    return { bar };
  }

  @Get('query-args', { returns: false })
  queryGet(
    @Query('baz') baz: number,
  ) {
    return { baz };
  }

  @Get('query-optional', { returns: false })
  queryOptionalGet(
    @Query('baz', { required: false }) baz: number,
  ) {
    return { baz, other: 'yes' };
  }

  @Get('header-args', { returns: false })
  headerGet(
    @Header('my-header') headerValue: number,
  ) {
    return { value: headerValue };
  }

  @Get('header-args/optional', { returns: false })
  headerOptionalGet(
    @Header('my-header', { schema: Number, required: false }) headerValue?: number,
  ) {
    return { value: headerValue, other: 'yes' };
  }

  @Get('no-args', { returns: false })
  noArgsGet() {
    return { hello: 'world' };
  }

  @Post('rbody-test')
  requestBodyTest(
    @RequestBody(RBody) body: RBody,
  ): RBody {
    return body;
  }

  @Get('bad-response-body')
  badResponseBodyTest(): RBody {
    return { foo: 'this is not a number', baz: null } as any;
  }

  @Get('bad-response-body/async', { returns: RBody })
  badResponseBodyAsyncTest(): Promise<RBody> {
    return { foo: 'this is not a number', baz: null } as any;
  }

  @Post('request-body-test-alt', { returns: false })
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
    expect(res.statusCode).toBe(HttpStatus.OK);
    expect(res.json()).toMatchObject({ hello: 'world' });
  });

  it('should 500 if a response body is incorrect', async () => {
    const res = await tester.inject({ method: 'GET', url: '/bad-response-body' });
    expect(res.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.json().message).toMatch(/^foo is/);
  });

  it('should 500 if a response body is incorrect in an async function (explicit returns)', async () => {
    const res = await tester.inject({ method: 'GET', url: '/bad-response-body/async' });
    expect(res.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.json().message).toMatch(/^foo is/);
  });

  it('should coerce correct path arguments', async () => {
    const res = await tester.inject({ method: 'GET', url: '/path-args/37' });
    expect(res.statusCode).toBe(HttpStatus.OK);
    expect(res.json()).toMatchObject({ bar: 37 });
  });

  it('should reject bad path arguments', async () => {
    const res = await tester.inject({ method: 'GET', url: '/path-args/badarg' });
    // this is a little fragile but if ajv changes these, we'll deal with it.
    expect(res.json().message).toBe('params.bar should be number');
    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
  });

  it('should coerce correct query arguments', async () => {
    const res = await tester.inject({ method: 'GET', url: '/query-args', query: { baz: 37 } });
    expect(res.statusCode).toBe(HttpStatus.OK);
    expect(res.json()).toMatchObject({ baz: 37 });
  });

  it('should not fail on optional query arguments', async () => {
    const res = await tester.inject({ method: 'GET', url: '/query-optional'});
    expect(res.statusCode).toBe(HttpStatus.OK);
    expect(res.json()).toMatchObject({ other: 'yes' });
  });

  it('should reject bad query arguments', async () => {
    const res = await tester.inject({ method: 'GET', url: '/query-args', query: { baz: 'bad' } });
    // this is a little fragile but if ajv changes these, we'll deal with it.
    expect(res.json().message).toBe('querystring.baz should be number');
    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
  });

  it('should coerce correct header arguments', async () => {
    const res = await tester.inject({ method: 'GET', url: '/header-args', headers: { 'my-header': 37 } });
    expect(res.statusCode).toBe(HttpStatus.OK);
    expect(res.json()).toMatchObject({ value: 37 });
  });

  it('should reject bad header arguments', async () => {
    const res = await tester.inject({ method: 'GET', url: '/header-args', headers: { 'my-header': 'moop' } });
    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(res.json().message).toBe('headers[\'my-header\'] should be number');
  });

  it('should not fail on optional header arguments', async () => {
    const res = await tester.inject({ method: 'GET', url: '/header-args/optional'});
    expect(res.statusCode).toBe(HttpStatus.OK);
    expect(res.json()).toMatchObject({ other: 'yes' });
  });

  it('should coerce correct simple request bodies', async () => {
    const res = await tester.inject({
      method: 'POST', url: '/rbody-test',
      headers: { 'content-type': 'application/json' },
      payload: { foo: '37', baz: 'orange' },
    });

    expect(res.json()).toMatchObject({ foo: 37, baz: 'orange' });
    expect(res.statusCode).toBe(HttpStatus.OK);
  });

  it('should reject bad simple request bodies', async () => {
    const res = await tester.inject({
      method: 'POST', url: '/rbody-test',
      headers: { 'content-type': 'application/json' },
      payload: { foo: 'rectangle', baz: 'orange' },
    });

    expect(res.json().message).toBe('body.foo should be number');
    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
  });

  it('should handle JSON Schema request bodies', async () => {
    const res = await tester.inject({
      method: 'POST', url: '/request-body-test-alt',
      headers: { 'content-type': 'application/json' },
      payload: { hello: 'world' },
    });

    expect(res.json()).toMatchObject({ value: 'world' });
    expect(res.statusCode).toBe(HttpStatus.OK);
  });
});

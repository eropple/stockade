// tslint:disable: prefer-function-over-method
import { IModule, Module } from '@stockade/core';
import { Domain } from '@stockade/inject';

import { Controller, Delete, Get, Patch, Post, Put } from '../annotations';
import { AnnotationKeys } from '../annotations/keys';
import { Http } from '../builder';
import { buildMappedControllerInfo } from './controller-info';

class ReturnDTO {
  readonly a!: number;
  readonly b!: string;
}

@Controller()
class TestController1 {
  @Get()
  testGet() {
    return 5;
  }

  @Post('/post')
  testPost() {
    return 'hello';
  }

  @Put('/put')
  testPut(): ReturnDTO {
    return { a: 1, b: 'foo' };
  }

  @Delete('/delete', { returnSchema: ReturnDTO })
  async testDelete(): Promise<ReturnDTO> {
    return { a: 2, b: 'bar' };
  }

  @Patch('/patch')
  testPatch(): void {}
}

const m =
  Module('test')
    .apply(
      Http()
        .controllers(TestController1),
    )
    .build();
const domain: Domain<IModule> = Domain.fromDefinition<IModule>(m);

describe('metadata utils', () => {
  it ('should extract a base route from a controller', () => {
    const controllers = buildMappedControllerInfo([[TestController1, domain]]);

    expect(controllers[0].controller).toBe(TestController1);
    expect(controllers[0]['@stockade/http:CONTROLLER_INFO']).toMatchObject({
      basePath: '/',
    });
  });

  it('should extract route and method metadata from an endpoint', () => {
    const controllers = buildMappedControllerInfo([[TestController1, domain]]);
    const controllerInfo = controllers[0];

    expect(controllerInfo.controller).toBe(TestController1);

    expect(controllerInfo.endpoints.testGet).toMatchObject({
      [AnnotationKeys.ROUTE_METHOD]: 'get',
      [AnnotationKeys.ROUTE_PATH]: '',
    });

    expect(controllerInfo.endpoints.testPost).toMatchObject({
      [AnnotationKeys.ROUTE_METHOD]: 'post',
      [AnnotationKeys.ROUTE_PATH]: 'post',
    });
  });
});

import { InfoObject, OpenAPIObject } from 'openapi3-ts';

import { IMappedController } from '@stockade/http';

import { OAS3Controller } from '../oas3.controller';

export async function buildOAS3(
  info: InfoObject,
  controllers: ReadonlyArray<IMappedController>,
): Promise<OpenAPIObject> {
  const doc: OpenAPIObject = {
    openapi: '3.1',
    info,
    paths: {},
  };

  for (const controllerInfo of controllers) {
    if (controllerInfo.controller === OAS3Controller) { continue; }

    console.log(controllerInfo);
  }

  return doc;
}

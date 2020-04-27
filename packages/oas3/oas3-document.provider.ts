import { OpenAPIObject } from 'openapi3-ts';

import { CONTROLLERS, HTTP, IMappedController } from '@stockade/http';
import { IFactoryProviderDefinition } from '@stockade/inject';

import { OAS3_CONFIG, OpenAPIConfig } from './config';
import { buildOAS3 } from './oas-builder';

export const OAS3_DOCUMENT = Symbol.for('@stockade/oas3:OAS3_DOCUMENT');
export const oas3DocumentProvider: IFactoryProviderDefinition<OpenAPIObject> = {
  key: OAS3_DOCUMENT,
  lifecycle: HTTP,
  inject: [CONTROLLERS, OAS3_CONFIG],
  fn: async (c: ReadonlyArray<IMappedController>, config: OpenAPIConfig) => {
    const doc = await buildOAS3(config.info, c);

    if (config.modifyFn) {
      await config.modifyFn(doc);
    }

    return doc;
  }
};

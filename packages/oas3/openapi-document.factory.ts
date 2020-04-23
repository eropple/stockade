import { OpenAPIObject } from 'openapi3-ts';

import { CONTROLLERS, HTTP } from '@stockade/http';
import { IFactoryProviderDefinition } from '@stockade/inject';

import { OPENAPI3_CONFIG, OpenAPIConfig } from './config';
import { OASBuilder } from './oas-builder';

export const oas3DocumentProvider: IFactoryProviderDefinition<OpenAPIObject> = {
  key: 'OAS3_DOCUMENT',
  lifecycle: HTTP,
  inject: [CONTROLLERS, OPENAPI3_CONFIG],
  fn: async (c: any, config: OpenAPIConfig) => {
    const builder = new OASBuilder(config.info);

    const doc = await builder.build(c);

    await config.modifyFn(doc);

    return doc;
  }
};

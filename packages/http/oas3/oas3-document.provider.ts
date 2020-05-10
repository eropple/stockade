import { OpenAPIObject } from 'openapi3-ts';

import { LOGGER } from '@stockade/core';
import { CONTROLLERS, HTTP, IMappedController, SCHEMATIZER } from '@stockade/http';
import { IFactoryProviderDefinition } from '@stockade/inject';
import { Schematizer } from '@stockade/schemas';
import { Logger } from '@stockade/utils/logging';

import { OAS3_CONFIG, OpenAPIConfig } from './config';
import { OASBuilder } from './oas-builder';

export const OAS3_DOCUMENT = Symbol.for('@stockade/oas3:OAS3_DOCUMENT');
export const oas3DocumentProvider: IFactoryProviderDefinition<OpenAPIObject> = {
  key: OAS3_DOCUMENT,
  lifecycle: HTTP,
  inject: [CONTROLLERS, SCHEMATIZER, OAS3_CONFIG, LOGGER],
  fn: async (
    c: ReadonlyArray<IMappedController>,
    schematizer: Schematizer,
    config: OpenAPIConfig,
    logger: Logger,
  ) => {
    // TODO: inject logger down into the OAS3 builder
    const builder = new OASBuilder(logger, schematizer, config);
    const doc = await builder.build(c, config.info);

    if (config.modifyDocFn) {
      await config.modifyDocFn(doc);
    }

    // TODO: validate document and log any errors; optionally kill server on start if not correct
    return doc;
  }
};
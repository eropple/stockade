import { OpenAPIObject } from 'openapi3-ts';

import { LOGGER } from '@stockade/core';
import { CONTROLLERS, HTTP, IMappedController, SCHEMATIZER } from '@stockade/http';
import { IFactoryProviderDefinition } from '@stockade/inject';
import { Schematizer } from '@stockade/schemas';
import { Logger } from '@stockade/utils/logging';

import { OAS3_CONFIG, OpenAPIConfig } from './config';
import { OAS3Error } from './error';
import { OASBuilder } from './oas-builder';
import { validateDocument } from './validation';

export const OAS3_DOCUMENT = Symbol.for('@stockade/oas3:OAS3_DOCUMENT');
export const oas3DocumentProvider: IFactoryProviderDefinition<OpenAPIObject> = {
  key: OAS3_DOCUMENT,
  lifecycle: HTTP,
  inject: [CONTROLLERS, SCHEMATIZER, OAS3_CONFIG, LOGGER],
  fn: async (
    c: ReadonlyArray<IMappedController>,
    schematizer: Schematizer,
    config: OpenAPIConfig,
    baseLogger: Logger,
  ) => {
    // TODO: inject logger down into the OAS3 builder
    const logger = baseLogger.child({ component: 'OAS3DocumentProvider' });
    const builder = new OASBuilder(logger, schematizer, config);
    const doc = await builder.build(c, config.info);

    if (config.modifyDocFn) {
      await config.modifyDocFn(doc);
    }

    const docValidation = config.docValidation ?? 'perform';
    logger.info({ docValidation }, 'OAS3 document completed.');
    if (docValidation !== 'skip') {
      const { errors, warnings } = await validateDocument(doc);

      if (!errors && !warnings) {
        logger.info('OAS3 validation performed: no errors!');
      } else {
        if (warnings) {
          logger.warn({ warn: warnings.toString() }, `Warning when validating OpenAPI document: ${warnings}`);
        }

        if (errors) {
          logger.error({ err: errors.toString() }, `Error when validating OpenAPI document: ${errors}`);

          // TODO: implement docValidation == 'perform'
        }
      }
    }

    // TODO: validate document and log any errors; optionally kill server on start if not correct
    return doc;
  }
};

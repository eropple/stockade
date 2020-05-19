import { FastifyInstance, JSONSchema as FastifyJSONSchema, RouteSchema } from 'fastify';
import { JSONSchema7 } from 'json-schema';

import { SchematizedDocumentInstance } from '@stockade/schemas';
import { StockadeError } from '@stockade/utils/error';
import { Logger } from '@stockade/utils/logging';

import { HttpFacetError } from '../errors';
import { IMappedEndpointDetailed, MappedEndpointParameter } from '../types';

export function makeEndpointSchemaForFastify(
  logger: Logger,
  endpointInfo: IMappedEndpointDetailed,
  allParameters: ReadonlyArray<MappedEndpointParameter>,
  document: SchematizedDocumentInstance,
  disableResponseValidation: boolean,
): RouteSchema {
  try {
    let response: {
      [code: number]: FastifyJSONSchema,
      [code: string]: FastifyJSONSchema
    } | undefined;
    try {
      response =
        disableResponseValidation
          ? undefined
          : Object.fromEntries(
              Object.entries(endpointInfo.responses)
                // .filter(entry => !!entry[1])
                .map(entry => [entry[0], document.inferOrReference(entry[1])],
              ),
            );
    } catch (err) {
      logger.error(
        { err },
        `Failed to generate response schema for endpoint ${endpointInfo.handlerName} in ` +
        `controller ${endpointInfo.controller.name} due to an error. Skipping response ` +
        `specification and validation.`,
      );
    }

    const ret: RouteSchema = {
      response,
    };

    const { requestBody } = endpointInfo;
    if (requestBody) {
      ret.body = document.inferOrReference(requestBody.schema);
    }

    const headerSchemaEnvelope: JSONSchema7 = {
      type: 'object',
      required: [],
      properties: {},
    };

    const pathSchemaEnvelope: JSONSchema7 = {
      type: 'object',
      required: [],
      properties: {},
    };

    const querySchemaEnvelope: JSONSchema7 = {
      type: 'object',
      required: [],
      properties: {},
    };

    for (const parameter of allParameters) {
      if (!parameter) { continue; }

      switch (parameter.in) {
        case 'header':
          headerSchemaEnvelope.properties![parameter.name] = document.inferOrReference(parameter.schema);
          if (parameter.required) {
            headerSchemaEnvelope.required!.push(parameter.name);
          }
          break;
        case 'path':
          pathSchemaEnvelope.required!.push(parameter.name);
          pathSchemaEnvelope.properties![parameter.name] = document.inferOrReference(parameter.schema);
          break;
        case 'query':
          querySchemaEnvelope.properties![parameter.name] = document.inferOrReference(parameter.schema);
          if (parameter.required) {
            querySchemaEnvelope.required!.push(parameter.name);
          }
          break;
        default:
          throw new StockadeError(
            `endpoint '${endpointInfo.handlerName}' in '${endpointInfo.controller.name}': ` +
            `Unrecognized parameter.in '${(parameter as any).in ?? 'undefined'}'.`,
          );
      }
    }

    if (Object.keys(headerSchemaEnvelope.properties!).length > 0) {
      ret.headers = headerSchemaEnvelope;
    }

    if (Object.keys(pathSchemaEnvelope.properties!).length > 0) {
      ret.params = pathSchemaEnvelope;
    }

    if (Object.keys(querySchemaEnvelope.properties!).length > 0) {
      ret.querystring = querySchemaEnvelope;
    }

    return ret;
  } catch (err) {
    throw new HttpFacetError(`Error when building endpoint '${endpointInfo.handlerName}' in controller '${endpointInfo.controller.name}'.`, err);
  }
}

import { FastifyInstance, JSONSchema as FastifyJSONSchema, RouteSchema } from 'fastify';
import { JSONSchema7 } from 'json-schema';
import * as _ from 'lodash';

import { IModule } from '@stockade/core';
import { Domain } from '@stockade/inject';
import { SchematizedDocumentInstance, Schematizer } from '@stockade/schemas';
import { StockadeError } from '@stockade/utils/error';
import { Logger } from '@stockade/utils/logging';
import { isClass } from '@stockade/utils/type-guards';

import { AnnotationKeys } from '../annotations/keys';
import { HttpFacetError } from '../errors';
import { IFastifyHookDefinition } from '../hooks';
import {
  hasOnErrorHook,
  hasOnRequestHook,
  hasOnResponseHook,
  hasOnSendHook,
  hasPreHandlerHook,
  hasPreParsingHook,
  hasPreSerializationHook,
  hasPreValidationHook,
} from '../hooks/helpers';
import { isHttpModule } from '../IHttpModule';
import { ControllerClass } from '../types';
import {
  IMappedEndpointDetailed,
  MappedEndpointParameter,
} from '../types/controller-info';

export function findControllers(
  rootDomain: Domain<IModule>,
): ReadonlyArray<[ControllerClass, Domain<IModule>]> {
  const ret: Array<[ControllerClass, Domain<IModule>]> = [];

  for (const domain of [rootDomain, ...rootDomain.descendants]) {
    const defn = domain.definition;

    if (isHttpModule(defn) && defn.controllers) {
      for (const controller of defn.controllers) {
        ret.push([controller, domain]);
      }
    }
  }

  return ret;
}

export function findHooks(
  rootDomain: Domain<IModule>,
): ReadonlyArray<[IFastifyHookDefinition, Domain<IModule>]> {
  const ret: Array<[IFastifyHookDefinition, Domain<IModule>]> = [];

  for (const domain of [rootDomain, ...rootDomain.descendants]) {
    const defn = domain.definition;

    if (isHttpModule(defn) && defn.hooks) {
      for (const hook of defn.hooks) {
        const value = isClass(hook) ? { class: hook, weight: 0 } : hook;
        ret.push([value, domain]);
      }
    }
  }

  return ret;
}

export function extractHooks(hookDefs: ReadonlyArray<[IFastifyHookDefinition, Domain<IModule>]>) {
  return {
    onRequest:
      _.sortBy(hookDefs.filter(h => hasOnRequestHook(h[0].class)), h => h[0].weight ?? 0),
    preParsing:
      _.sortBy(hookDefs.filter(h => hasPreParsingHook(h[0].class)), h => h[0].weight ?? 0),
    preValidation:
      _.sortBy(hookDefs.filter(h => hasPreValidationHook(h[0].class)), h => h[0].weight ?? 0),
    preHandler:
      _.sortBy(hookDefs.filter(h => hasPreHandlerHook(h[0].class)), h => h[0].weight ?? 0),
    preSerialization:
      _.sortBy(hookDefs.filter(h => hasPreSerializationHook(h[0].class)), h => h[0].weight ?? 0),
    onError:
      _.sortBy(hookDefs.filter(h => hasOnErrorHook(h[0].class)), h => h[0].weight ?? 0),
    onSend:
      _.sortBy(hookDefs.filter(h => hasOnSendHook(h[0].class)), h => h[0].weight ?? 0),
    onResponse:
      _.sortBy(hookDefs.filter(h => hasOnResponseHook(h[0].class)), h => h[0].weight ?? 0),
  };
}

export function getAllParametersForEndpoint(
  endpointInfo: IMappedEndpointDetailed,
): Array<MappedEndpointParameter> {
  const allParameters = [
    ...endpointInfo.explicitParameters,
    ...[...endpointInfo.parameters.values()].map(p => p.implicitParameterInfo),
  ].filter((epr): epr is MappedEndpointParameter => !!epr);

  return allParameters
}

export function bindSchematizerToFastify(schematizer: Schematizer, fastify: FastifyInstance) {
  const jsonSchemaDocument = schematizer.makeDocumentInstance('http-facet.json#/definitions');
  const fastifyModelDocument: JSONSchema7 = {
    $id: 'http-facet.json',
    definitions: {},
  };
  jsonSchemaDocument.insertSchemasIntoObject(fastifyModelDocument);
  fastify.addSchema(fastifyModelDocument);

  return jsonSchemaDocument;
}

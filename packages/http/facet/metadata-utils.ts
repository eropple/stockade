import 'reflect-metadata';
import { inspect } from 'util';

import { IModule } from '@stockade/core';
import { Domain } from '@stockade/inject';
import { Schema, Schematizer, SchemaWithClassTypes } from '@stockade/schemas';
import { StockadeError } from '@stockade/utils/error';
import {
  getAllMetadataForClass,
  getAllPropertyMetadataForClass,
  getPropertyParameterMetadataForClass,
  PARAMETER_DESIGN_TYPE,
} from '@stockade/utils/metadata';

import { AnnotationKeys } from '../annotations/keys';
import { ControllerClass } from '../types';
import { assembleUrlPath, HTTPMethodsWithBodies } from '../utils';
import {
  IMappedController,
  IMappedControllerBasic,
  IMappedControllerInfo,
  IMappedEndpointDetailed,
  IMappedEndpointParameter,
  IParameterResolver,
  isMappedControllerBasic,
  isMappedEndpointBasic,
  MappedEndpointParameter,
} from './controller-info';

export function extractMappedControllerMetadata(
  controller: ControllerClass,
  domain: Domain<IModule>,
): IMappedController {
  const controllerBase: any = getAllMetadataForClass(controller);
  if (!isMappedControllerBasic(controllerBase)) {
    throw new Error(`Controller class '${controller.name}' lacks Controller annotation.`);
  }

  const controllerInfo = controllerBase['@stockade/http:CONTROLLER_INFO'];

  return {
    ...controllerBase,
    controller,
    domain,
    endpoints: extractMappedEndpointMetadata(controller, controllerInfo),
  };
}

function extractMappedEndpointMetadata(
  controller: ControllerClass,
  controllerInfo: IMappedControllerInfo,
): { [name: string]: IMappedEndpointDetailed } {
  const ret: { [name: string]: IMappedEndpointDetailed } = {};

  for (const handlerName of Object.getOwnPropertyNames(controller.prototype)) {
    if (handlerName === 'constructor') { continue; }
    const endpointBasicInfo = getAllPropertyMetadataForClass(controller, handlerName);
    if (!isMappedEndpointBasic(endpointBasicInfo)) { continue; }

    const parameters: Map<number, IMappedEndpointParameter> = new Map();
    let endpointInfo: IMappedEndpointDetailed = {
      ...endpointBasicInfo,
      controller,
      fullUrlPath: assembleUrlPath(controllerInfo.basePath, endpointBasicInfo['@stockade/http:ROUTE_PATH']),
      handlerName,
      parameters, // this will be mutable in-function and that is a minor sin, but it's OK
      requestBody: undefined,
    };

    const baseParameters = getPropertyParameterMetadataForClass(controller, handlerName);


    for (const [idx, baseParameter] of baseParameters.entries()) {
      const resolver = baseParameter[AnnotationKeys.PARAMETER_RESOLVER] as (IParameterResolver | undefined);
      let implicitParameterInfo: MappedEndpointParameter | undefined = resolver?.implicitParameter;
      const requestBody = resolver?.requestBody;

      if (implicitParameterInfo) {
        const designType = baseParameter[PARAMETER_DESIGN_TYPE];
        let schema = implicitParameterInfo.schema ?? designType;

        if (typeof(schema) === 'function') {
          schema = Schematizer.inferBaseType(schema) ?? schema;
        }

        implicitParameterInfo = {
          ...implicitParameterInfo,
          schema,
        };
      }

      if (requestBody) {
        const httpMethod = endpointInfo['@stockade/http:ROUTE_METHOD'];
        if (!HTTPMethodsWithBodies.has(httpMethod)) {
          throw new StockadeError(
            `Controller '${controller.name}', endpoint '${handlerName}', parameter ${idx}: ` +
            `cannot have request body with method '${httpMethod}'.`,
          );
        }

        if (endpointInfo.requestBody) {
          throw new StockadeError(
            `Controller '${controller.name}', endpoint '${handlerName}', parameter ${idx}: ` +
            `more than one request body found via parameter list.`,
          );
        }

        endpointInfo = { ...endpointInfo, requestBody };
      }

      const parameter: IMappedEndpointParameter = {
        ...baseParameter,
        implicitParameterInfo,
      };

      parameters.set(idx, parameter);
    }

    ret[handlerName] = endpointInfo;
  }

  return ret;
}

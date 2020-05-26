import * as _ from 'lodash';
import 'reflect-metadata';

import { IModule, LOGGER } from '@stockade/core';
import { Domain } from '@stockade/inject';
import { Schematizer } from '@stockade/schemas';
import { StockadeError } from '@stockade/utils/error';
import {
  getAllMetadataForClass,
  getAllPropertyMetadataForClass,
  getPropertyParameterMetadataForClass,
  PARAMETER_DESIGN_TYPE,
} from '@stockade/utils/metadata';

import { AnnotationKeys } from '../annotations/keys';
import { HttpStatus } from '../http-statuses';
import { ISecurity } from '../security';
import { ControllerClass, IMappedEndpointBasic, IMappedEndpointRequestBody } from '../types';
import {
  IMappedController,
  IMappedControllerBasic,
  IMappedControllerInfo,
  IMappedEndpointDetailed,
  IMappedEndpointParameter,
  IParameterResolver,
  isMappedControllerBasic,
  isMappedEndpointBasic,
  isMethodReturnByCode,
  MappedEndpointParameter,
  MethodReturnByCode,
} from '../types/controller-info';
import { assembleUrlPath, HTTPMethodsWithBodies } from '../utils';

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
    endpoints: extractMappedEndpointMetadata(controller, controllerBase, controllerInfo),
  };
}

function extractMappedEndpointMetadata(
  controller: ControllerClass,
  controllerBase: IMappedControllerBasic,
  controllerInfo: IMappedControllerInfo,
): { [name: string]: IMappedEndpointDetailed } {
  const ret: { [name: string]: IMappedEndpointDetailed } = {};

  for (const handlerName of Object.getOwnPropertyNames(controller.prototype)) {
    if (handlerName === 'constructor') { continue; }
    const endpointBasicInfo = getAllPropertyMetadataForClass(controller, handlerName);
    if (!isMappedEndpointBasic(endpointBasicInfo)) { continue; }


    const routeOptions = endpointBasicInfo['@stockade/http:ROUTE_OPTIONS'] || {};
    const parameters: Map<number, IMappedEndpointParameter> = new Map();

    const returnCode: number =
      endpointBasicInfo['@stockade/http:ROUTE_OPTIONS'].returnCode
        ?? HttpStatus.OK;

    const endpointInfoReturns = endpointBasicInfo['@stockade/http:ROUTE_OPTIONS'].returns;
    const designReturnType = endpointBasicInfo['design:returntype'];
    const responses: MethodReturnByCode =
      endpointInfoReturns === false
        ? {}
        : endpointInfoReturns
          ? isMethodReturnByCode(endpointInfoReturns)
            ? endpointInfoReturns
            : { [returnCode]: endpointInfoReturns }
          : designReturnType
            ? { [returnCode]: designReturnType }
            : {};

    const securityAssignments: Array<ISecurity> = _.sortBy([
      ...(controllerBase['@stockade/http:SECURITY'] ?? []),
      ...(endpointBasicInfo['@stockade/http:SECURITY'] ?? []),
    ], i => i.weight ?? 0);


    let endpointInfo: IMappedEndpointDetailed = {
      ...endpointBasicInfo,
      controller,
      fullUrlPath: assembleUrlPath(controllerInfo.basePath, endpointBasicInfo['@stockade/http:ROUTE_PATH']),
      handlerName,
      parameters, // this will be mutable in-function and that is a minor sin, but it's OK

      description: routeOptions.description ?? autoDocumentEndpoint(handlerName, endpointBasicInfo),
      explicitParameters: [
        ...(controllerBase['@stockade/HTTP:EXPLICIT_PARAMETERS'] || []),
        ...(endpointBasicInfo['@stockade/HTTP:EXPLICIT_PARAMETERS'] || [])
      ],
      securityAssignments,

      returnCode,
      responses,
      requestBody: undefined, // this is also mutable in-function; sucks, but we deal.
      '@stockade/http:ROUTE_OPTIONS': routeOptions,
    };

    const baseParameters = getPropertyParameterMetadataForClass(controller, handlerName);


    for (const [idx, baseParameter] of baseParameters.entries()) {
      const resolver = baseParameter[AnnotationKeys.PARAMETER_RESOLVER] as (IParameterResolver | undefined);
      let implicitParameterInfo: MappedEndpointParameter | undefined = resolver?.implicitParameter;

      let requestBody: IMappedEndpointRequestBody | undefined;
      if (resolver?.requestBody) {
        requestBody = resolver.requestBody;
      } else if (resolver?.friendlyName === 'RequestBody') {
        const designType = baseParameter[PARAMETER_DESIGN_TYPE];
        if (!designType) {
          throw new StockadeError(
            `Controller '${controller.name}', endpoint '${handlerName}', parameter ${idx}: ` +
            `cannot derive type of RequestBody; please specify explicitly in annotation.`,
          );
        }

        requestBody = { schema: designType };
      }

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

export function buildMappedControllerInfo(
  controllers: ReadonlyArray<[ControllerClass, Domain<IModule>]>,
): Array<IMappedController> {
  return controllers
    .map(([c, d]) => extractMappedControllerMetadata(c, d));
}

function autoDocumentEndpoint(handlerName: string, endpointBasicInfo: IMappedEndpointBasic): string {
  return `The ${handlerName} endpoint.`;
}

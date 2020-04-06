import { Schematizer } from '@stockade/schemas';
import { Logger } from '@stockade/utils/logging';

import { IMappedController, IMappedEndpointDetailed, IParameterResolver } from './controller-info';
import { getAllParametersForEndpoint } from './utils';

export function buildSchematizer(logger: Logger, controllers: ReadonlyArray<IMappedController>): Schematizer {
  const schematizer = new Schematizer(logger);

  logger.info('Walking controller map to find all schema candidates.');
  for (const controllerInfo of controllers)
  for (const [handlerName, endpointInfo] of Object.entries(controllerInfo.endpoints)) {
    const eLogger = logger.child({ controllerName: controllerInfo.controller.name, handlerName });
    const returnType = endpointInfo['design:returntype'];
    if (returnType) {
      eLogger.debug({ registeringFrom: 'returnType' }, `Registering type '${returnType}'.`);
      // schematizer won't try to process Promise, Array, String, etc.
      schematizer.registerClass(returnType);
    }

    const requestBodySchema = endpointInfo.requestBody?.schema;
    if (requestBodySchema && typeof(requestBodySchema) === 'function') {
      schematizer.registerClass(requestBodySchema);
    }

    const allParameters = getAllParametersForEndpoint(endpointInfo);

    for (const parameter of allParameters) {
      const schema = parameter.schema;
      if (schema && typeof(schema) === 'function') {
        eLogger.debug({ registeringFrom: 'parameter' }, `Registering type '${returnType}'.`);
        schematizer.registerClass(schema);
      }
    }
  }

  if (logger.isLevelEnabled('info')) {
    const schematizedModelNames = [...schematizer.schemas.keys()];
    logger.info(
      { schematizedClasses: schematizedModelNames },
      `Schematized ${schematizedModelNames.length} during setup step.`,
    );
  }

  return schematizer;
}

export function extractParameterResolversFromParameters(
  endpointInfo: IMappedEndpointDetailed,
): Array<IParameterResolver> {
  if (!endpointInfo.parameters) {
    return [];
  }

  const ret: Array<IParameterResolver> = [];
  for (const [idx, parameter] of endpointInfo.parameters) {
    const resolver = parameter['@stockade/http:PARAMETER_RESOLVER'];
    if (!resolver) {
      throw new Error(
        `Endpoint '${endpointInfo.handlerName}' in controller '${endpointInfo.controller.name}' ` +
        `is missing a parameter resolver for index: ${idx}`,
      );
    }

    ret[idx] = resolver;
  }

  return ret;
}

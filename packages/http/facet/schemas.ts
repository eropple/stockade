import { Schematizer, SchemaWithClassTypes } from '@stockade/schemas';
import { Logger } from '@stockade/utils/logging';
import { PARAMETER_DESIGN_TYPE } from '@stockade/utils/metadata';

import { AnnotationKeys } from '../annotations/keys';
import { IMappedController, IMappedEndpointDetailed, IParameterResolver } from './controller-info';

export function buildSchematizer(logger: Logger, controllers: ReadonlyArray<IMappedController>): Schematizer {
  const schematizer = new Schematizer(logger);


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

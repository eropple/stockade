import { AppendArrayMetadata } from '@stockade/utils/metadata';

import { MappedEndpointParameter } from '../types/controller-info';
import { AnnotationKeys } from './keys';

/**
 * Sometimes, parameters are required that do not themselves get used in
 * an endpoint handler. For example, if a handler receives a resource
 * through injection, the standard Fastify validator and the OAS3 validator
 * can't find it in order to specify it as a requirement. By tagging a
 * controller or an endpoint with `ExplicitParameter`, one is able to ensure
 * that it is checked and also expressed in all relevant OAS3 documentation.
 *
 * @param param the parameter to register
 */
export function ExplicitParameter(param: MappedEndpointParameter) {
  return AppendArrayMetadata(AnnotationKeys.EXPLICIT_PARAMETERS, param);
}

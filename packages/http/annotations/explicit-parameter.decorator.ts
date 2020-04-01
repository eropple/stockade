import { AppendArrayMetadata } from '@stockade/utils/metadata';

import { MappedEndpointParameter } from '../facet/controller-info';
import { AnnotationKeys } from './keys';

export function ExplicitParameter(param: MappedEndpointParameter) {
  return AppendArrayMetadata(AnnotationKeys.EXPLICIT_PARAMETERS, param);
}

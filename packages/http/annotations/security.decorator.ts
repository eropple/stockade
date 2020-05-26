import { Class } from 'utility-types';

import { AppendArrayMetadata } from '@stockade/utils/metadata';

import { ISecurity } from '../security';
import { AnnotationKeys } from './keys';

/**
 * Registers a security for this controller or endpoint. Securities can be considered
 * to be `OR`'d together - if any security returns `true`, then the request continues
 * to the endpoint handler.
 *
 * @param cls The class of the security to register
 * @param args Any arguments that should be passed to this security at runtime
 */
export function Security(
  security: ISecurity,
) {
  return AppendArrayMetadata(AnnotationKeys.SECURITY, security);
}

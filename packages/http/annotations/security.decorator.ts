import { Class } from 'utility-types';

import { AppendArrayMetadata } from '@stockade/utils/metadata';

import { ISecurity } from '../security';
import { AnnotationKeys } from './keys';

/**
 * Registers a security for this controller or endpoint.
 *
 * @param cls The class of the security to register
 * @param args Any arguments that should be passed to this security at runtime
 */
export function Security<TSecurity extends ISecurity<TSecurityArgs>, TSecurityArgs>(
  cls: Class<TSecurity>,
  args: TSecurityArgs,
) {
  return AppendArrayMetadata(AnnotationKeys.SECURITY, { cls, args });
}

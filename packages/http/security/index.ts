import { Class } from 'utility-types';

import { IFunctionalInject } from '@stockade/inject';
import { StringTo } from '@stockade/utils/types';

import { HttpStatus } from '../http-statuses';

/**
 * Expresses to Stockade a given security's evaluation of a request.
 */
export enum SecurityOutcome {
  /**
   * The request (and by extension the requester) is allowed to access this endpoint.
   * If a security, evaluated in order of weight, returns `OK`, then the request
   * is permitted to continue and the handler is run.
   */
  OK,

  /**
   * The security cannot validate this request/requester. If all securities return
   * `UNRECOGNIZED`, the request will be replied to with a `401 Unauthorized`.
   */
  UNRECOGNIZED,

  /**
   * The security recognizes the request/requester and they are attempting to access
   * an endpoint to which they lack proper authorization. If a security, evaluated
   * in order of weight, returns `FORBIDDEN`, the request is immediately terminated
   * with a `403 Forbidden`.
   */
  FORBIDDEN,
}

/**
 * Stockade does not attempt to be prescriptive in what your application can do,
 * with regards to security. (There are good options. We will try to recommend
 * them.) To this end it implements only the concept of a _security_, which is
 * an object that determines for your application whether a given request is valid
 * based on any set of contextual data that you want to add.
 *
 * The reason that we implement a security at all, then, instead of leaving it to
 * your hooks is that securities are a sufficiently core concept that we want to
 * be able to allow libraries in the Stockade ecosystem to introspect them.
 *
 * If you're using some kind of scope-based system, this is also easier than
 * passing a class (or, heaven forfend, dynamically building one every time you
 * need one!).
 *
 * Securities are sorted by their `weight` value, which determines the order of
 * evaluation. `weight` defaults to `0`; we use a stable sort so they should be
 * evaluated in order of appending (first controller-level, then endpoint-level)
 * and so any failure to do so is a bug.
 */
export interface ISecurity extends IFunctionalInject<SecurityOutcome> {
  readonly name: string;

  readonly weight?: number;
}

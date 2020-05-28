import { ILifecycle, SINGLETON } from '@stockade/inject';
import { FACET, SINGLETON_LIFECYCLE, SUB_FACET } from '@stockade/inject/lifecycle';

/**
 * The lifecycle that corresponds to the startup and shutdown of the HTTP
 * facet within the Stockade runner.
 */
export const HTTP: symbol = Symbol.for(`@stockade/http:Lifecycle:HTTP`);
export const HTTP_LIFECYCLE: ILifecycle = {
  name: HTTP,
  parent: SINGLETON_LIFECYCLE,
  aliases: [FACET],
};

/**
 * The lifecycle that corresponds to the complete request workflow, from
 * request receipt to request close, for a HTTP request.
 */
export const HTTP_REQUEST: symbol = Symbol.for(`@stockade/http:Lifecycle:HTTP_REQUEST`);
export const HTTP_REQUEST_LIFECYCLE: ILifecycle = {
  name: HTTP_REQUEST,
  parent: HTTP_LIFECYCLE,
  aliases: [SUB_FACET],
};

/**
 * The lifecycle that corresponds to a complete WebSocket session, providing
 * resource (though, hopefully, not _data_) persistence across that WebSocket session.
 */
export const WS_SESSION: symbol = Symbol.for(`@stockade/http:Lifecycle:WS_SESSION`);
export const WS_SESSION_LIFECYCLE: ILifecycle = {
  name: WS_SESSION,
  parent: HTTP_REQUEST_LIFECYCLE,
  aliases: [SUB_FACET],
};

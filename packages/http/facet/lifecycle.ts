import { ILifecycle, SINGLETON } from '@stockade/inject';
import { FACET, SUB_FACET } from '@stockade/inject/lifecycle';

/**
 * The lifecycle that corresponds to the startup and shutdown of the HTTP
 * facet within the Stockade runner.
 */
export const HTTP: ILifecycle = {
  name: Symbol.for('http'),
  parent: SINGLETON,
  aliases: [FACET],
};

/**
 * The lifecycle that corresponds to the complete request workflow, from
 * request receipt to request close, for a HTTP request.
 */
export const HTTP_REQUEST: ILifecycle = {
  name: Symbol.for('http_request'),
  parent: HTTP,
  aliases: [SUB_FACET],
};

/**
 * The lifecycle that corresponds to a complete WebSocket session, providing
 * resource (though, hopefully, not _data_) persistence across that WebSocket session.
 */
export const WS_SESSION: ILifecycle = {
  name: Symbol.for('ws_session'),
  parent: HTTP,
  aliases: [SUB_FACET],
};

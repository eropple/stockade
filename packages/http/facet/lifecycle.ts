import { ILifecycle, SINGLETON } from '@stockade/inject';

export const HTTP: ILifecycle = { name: Symbol.for('http'), parent: SINGLETON };
export const HTTP_REQUEST: ILifecycle = { name: Symbol.for('http_request'), parent: HTTP };
export const WS_SESSION: ILifecycle = { name: Symbol.for('ws_session'), parent: HTTP };

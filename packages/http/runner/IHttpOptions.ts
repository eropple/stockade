import * as Fastify from 'fastify';

import { IBaseOptions } from '@stockade/core/runner';

export interface IFastifyOptions {
  server?: Fastify.ServerOptions;
  listen?: Fastify.ListenOptions;

  preConfigure?: (instance: Fastify.FastifyInstance) => void;
  postConfigure?: (instance: Fastify.FastifyInstance) => void;
}

export interface IHttpOptions extends IBaseOptions {
  /**
   * Custom Fastify options to be passed to the underlying web server. Some
   * options passed here are modified or overridden during startup, mostly
   * around logging.
   */
  fastify?: IFastifyOptions;
}

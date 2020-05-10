import * as Fastify from 'fastify';

export interface IFastifyOptions {
  server?: Fastify.ServerOptions;
  listen?: Fastify.ListenOptions;

  preConfigure?: (instance: Fastify.FastifyInstance) => void;
  postConfigure?: (instance: Fastify.FastifyInstance) => void;
}

export interface IHttpOptions {
  /**
   * Custom Fastify options to be passed to the underlying web server. Some
   * options passed here are modified or overridden during startup, mostly
   * around logging.
   */
  fastify?: IFastifyOptions;

  /**
   * If set to `true`, Stockade will not validate responses returned from
   * your handlers as valid.
   *
   * If you are unsure of your data or require better latency (as this does
   * run your response through Fastify's response validation routine), you
   * can enable this option in production. We **strongly** recommend that
   * you do not disable this option in development, staging, and so on.
   */
  disableResponseValidation?: boolean;
}

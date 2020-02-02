import * as Fastify from 'fastify';

import { AppSpec } from '@stockade/core';
import { BaseRunner, IRunnerBehavior } from '@stockade/core/runner';

import { IHttpOptions } from './IHttpOptions';
import { HTTP } from './lifecycle';

const DEFAULT_HTTP_PORT = 10080;

const HTTP_BEHAVIOR: IRunnerBehavior = {
  baseLifecycle: HTTP,
};

export class HttpRunner extends BaseRunner<IHttpOptions> {
  private readonly fastify: Fastify.FastifyInstance;

  constructor(
    readonly appSpec: AppSpec,
    options: IHttpOptions,
  ) {
    super(HTTP_BEHAVIOR, appSpec, options);

    const fastifyServerOptions: Fastify.ServerOptions = prepareFastifyServerOptions(options);
    this.logger.debug({ fastifyServerOptions }, 'Creating Fastify instance.');
    this.fastify = Fastify.default(fastifyServerOptions);
  }
  protected doStart(): Promise<any> {
    const fastifyListenOptions = prepareFastifyListenOptions(this.options);
    this.logger.debug({ fastifyListenOptions }, 'Fastify listen options.');
    this.logger.info(`Starting Fastify on port '${fastifyListenOptions.port}`);

    return this.fastify.listen(prepareFastifyListenOptions(this.options));
  }

  protected doStop(): Promise<any> {
    return this.fastify.close();
  }
}

function prepareFastifyServerOptions(opts: IHttpOptions): Fastify.ServerOptions {
  const ret = opts?.fastify?.server ?? {};

  ret.logger = ret.logger ?? opts.logging ?? {
    level: 'info',
  };
  ret.logger.stream = process.stderr;

  return ret;
}

function prepareFastifyListenOptions(opts: IHttpOptions): Fastify.ListenOptions {
  const ret = opts?.fastify?.listen ?? {};
  ret.port = ret.port ?? DEFAULT_HTTP_PORT;

  return ret;
}

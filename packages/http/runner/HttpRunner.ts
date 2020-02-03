import * as Fastify from 'fastify';
import uuidV4 from 'uuid/v4';

import { IAppSpec, IModule } from '@stockade/core';
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
    readonly appSpec: IAppSpec,
    options: IHttpOptions,
  ) {
    super(HTTP_BEHAVIOR, appSpec, options);

    const fastifyServerOptions: Fastify.ServerOptions = this._prepareFastifyServerOptions(options);
    this.logger.debug({ fastifyServerOptions }, 'Creating Fastify instance.');
    this.fastify = Fastify.default(fastifyServerOptions);
  }
  protected doStart(): Promise<any> {
    const fastifyListenOptions = this._prepareFastifyListenOptions(this.options);
    this.logger.debug({ fastifyListenOptions }, 'Fastify listen options.');
    this.logger.info(`Starting Fastify on port '${fastifyListenOptions.port}`);

    return this.fastify.listen(fastifyListenOptions);
  }

  protected doStop(): Promise<any> {
    return this.fastify.close();
  }

  private _prepareFastifyServerOptions(opts: IHttpOptions): Fastify.ServerOptions {
    const childLogger = this.logger.child({ component: 'Fastify' });
    (childLogger as any).genReqId = uuidV4;

    const ret = opts?.fastify?.server ?? {};
    ret.logger = childLogger;

    return ret;
  }

  // tslint:disable-next-line: prefer-function-over-method
  private _prepareFastifyListenOptions(opts: IHttpOptions): Fastify.ListenOptions {
    const ret = opts?.fastify?.listen ?? {};
    ret.port = ret.port ?? DEFAULT_HTTP_PORT;

    return ret;
  }

}

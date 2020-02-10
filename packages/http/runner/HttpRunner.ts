import * as Fastify from 'fastify';
import * as hyperid from 'hyperid';

import { AppSpecBuilder, IAppSpec } from '@stockade/core';
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
    appSpec: IAppSpec | AppSpecBuilder,
    options: IHttpOptions,
  ) {
    super(HTTP_BEHAVIOR, appSpec, options);

    this.fastify = this._buildFastify();
  }
  protected doStart(): Promise<any> {
    const fastifyListenOptions = this._prepareFastifyListenOptions(this.options);
    this.logger.debug({ fastifyListenOptions }, 'Fastify listen options.');
    this.logger.info(`Starting Fastify on port ${fastifyListenOptions.port}.`);

    return this.fastify.listen(fastifyListenOptions);
  }

  protected doStop(): Promise<any> {
    return this.fastify.close();
  }

  private _prepareFastifyServerOptions(opts: IHttpOptions): Fastify.ServerOptions {
    const childLogger = this.logger.child({ component: 'Fastify' });
    const ret = opts?.fastify?.server ?? {};

    (ret as any).genReqId =
      (ret as any).genReqId ?? (() => hyperid.default({ fixedLength: true }).uuid);

    // End users can't override this. Some things need to be sane.
    ret.logger = childLogger;

    return ret;
  }

  // tslint:disable-next-line: prefer-function-over-method
  private _prepareFastifyListenOptions(opts: IHttpOptions): Fastify.ListenOptions {
    const ret = opts?.fastify?.listen ?? {};
    ret.port = ret.port ?? DEFAULT_HTTP_PORT;

    return ret;
  }

  private _buildFastify(): Fastify.FastifyInstance {
    const fastifyServerOptions: Fastify.ServerOptions = this._prepareFastifyServerOptions(this.options);
    this.logger.debug({ fastifyServerOptions }, 'Creating Fastify instance.');
    const fastify = Fastify.default(fastifyServerOptions);



    return fastify;
  }
}

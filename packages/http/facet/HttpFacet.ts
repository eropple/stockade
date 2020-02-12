import * as Fastify from 'fastify';
import * as hyperid from 'hyperid';

import { FacetBase, IAppSpec, IFacetBehavior } from '@stockade/core';
import { Domain, LifecycleInstance } from '@stockade/inject';
import { Logger } from '@stockade/utils/logging';

import '../extensions/fastify';
import { IHttpOptions } from './IHttpOptions';
import { HTTP, HTTP_REQUEST } from './lifecycle';
import { findControllers, findHooks } from './utils';

const DEFAULT_HTTP_PORT = 10080;

const HTTP_BEHAVIOR: IFacetBehavior = {
  facetRootLifecycle: HTTP,
};

export class HttpFacet extends FacetBase {
  readonly fastify: Fastify.FastifyInstance;

  constructor(
    logger: Logger,
    parentLifecycleInstance: LifecycleInstance,
    appSpec: IAppSpec,
    domain: Domain,
    private readonly options: IHttpOptions,
  ) {
    super(logger, parentLifecycleInstance, appSpec, domain, HTTP_BEHAVIOR);

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

    const controllers = findControllers(this.appSpec);
    this.logger.debug({ controllerClassNames: controllers.map(c => c.name )}, `${controllers.length} controllers found.`);
    const hooks = findHooks(this.appSpec);
    this.logger.debug({ hookClassNames: hooks.map(h => h.class.name )}, `${controllers.length} controllers found.`);

    // this hook is added to the server first because it needs to run at start to attach the
    // lifecycle used by other stuff.
    fastify.addHook('onRequest', (req) => {
      req.$stockade = {
        lifecycleInstance: new LifecycleInstance(HTTP_REQUEST, this.lifecycleInstance, this.logger),
      };
      console.log(req);
    });

    if (this.options.fastify?.preConfigure) {
      this.logger.debug('Running Fastify preconfigure.');
      this.options.fastify.preConfigure(fastify);
    }

    // TODO:  Take the sorted set of hooks and apply them
    //        - Each hook class should implement the interfaces in `fastify-hook-interfaces.ts`
    //        - Sort them into lists of classes that implement each hook
    //        - Add a _separate_ event handler for each class that requests it from the server
    //          lifecycle (which will re-use created hooks if they implement multiple hooks in
    //          the same class) and proxy the Fastify event args to it

    // TODO:  Take all controllers and route them

    if (this.options.fastify?.postConfigure) {
      this.logger.debug('Running Fastify postconfigure.');
      this.options.fastify.postConfigure(fastify);
    }

    return fastify;
  }
}

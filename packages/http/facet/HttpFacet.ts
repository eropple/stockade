import * as Fastify from 'fastify';
import * as hyperid from 'hyperid';

import { DEPENDENCY_LIFECYCLE, FacetBase, IAppSpec, IFacetBehavior, IModule, LOGGER } from '@stockade/core';
import { Domain, LifecycleInstance } from '@stockade/inject';
import { Logger } from '@stockade/utils/logging';

import { AnnotationKeys } from '../annotations/keys';
import '../extensions/fastify';
import {
  IFastifyHookDefinition,
  IOnErrorHook,
  IOnRequestHook,
  IOnResponseHook,
  IOnSendHook,
  IPreHandlerHook,
  IPreParsingHook,
  IPreSerializationHook,
  IPreValidationHook,
} from '../hooks';
import { CONTROLLERS, REPLY, REQUEST } from '../inject-keys';
import { stripPathSlashes } from '../utils';
import {
  buildMappedControllerInfo,
  IMappedController,
  IMappedEndpointDetailed,
  IParameterResolver,
} from './controller-info';
import { IHttpOptions } from './IHttpOptions';
import { HTTP, HTTP_REQUEST } from './lifecycle';
import { extractHooks, findControllers, findHooks } from './utils';

const DEFAULT_HTTP_PORT = 10080;

const HTTP_BEHAVIOR: IFacetBehavior = {
  facetRootLifecycle: HTTP,
};

export class HttpFacet extends FacetBase {
  readonly fastify: Fastify.FastifyInstance;

  private readonly _allControllers: ReadonlyArray<IMappedController>;
  private readonly _allHooks: ReadonlyArray<[IFastifyHookDefinition, Domain<IModule>]>;
  private readonly _options: IHttpOptions;

  constructor(
    logger: Logger,
    parentLifecycleInstance: LifecycleInstance,
    appSpec: IAppSpec,
    domain: Domain<IModule>,
    options: IHttpOptions,
  ) {
    super(logger, parentLifecycleInstance, appSpec, domain, HTTP_BEHAVIOR);

    this._options = options;
    const foundControllers = findControllers(this.domain);
    this.logger.debug(
      { controllerClassNames: foundControllers.map(c => c[0].name) },
      `${foundControllers.length} controllers found.`,
    );
    this._allControllers = buildMappedControllerInfo(foundControllers);
    this._allHooks = findHooks(this.domain);
    this.logger.debug(
      { hookClasses: this._allHooks.map(h => h[0].class.name) },
      `${this._allHooks.length} hooks found.`,
    );

    this.fastify = this._buildFastify();

    // Unlike a number of other frameworks, I _really_ want to make it metaprogrammable
    // from inside the server. When it comes time to writing OpenAPI docs and all that,
    // it'd be downright stupid to have to call some sort of external thing to doctor the
    // HTTP server. Should all be handled right here.
    this.lifecycleInstance.registerTemporary(CONTROLLERS, this._allControllers);
    this.logger.info({ allControllers: this._allControllers });
  }
  async doStart(): Promise<any> {
    const fastifyListenOptions = this._prepareFastifyListenOptions(this._options);
    this.logger.debug({ fastifyListenOptions }, 'Fastify listen options.');
    this.logger.info(`Starting Fastify on port ${fastifyListenOptions.port}.`);

    // tslint:disable-next-line: no-floating-promises
    this.fastify.listen(fastifyListenOptions);

    return true;
  }

  doStop(): Promise<any> {
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
    const fastifyServerOptions: Fastify.ServerOptions = this._prepareFastifyServerOptions(this._options);
    this.logger.debug({ fastifyServerOptions }, 'Creating Fastify instance.');
    const fastify = Fastify.default(fastifyServerOptions);

    const fastifyRequestIdHeader = (fastifyServerOptions as any).requestIdHeader ?? 'request-id';

    // this hook is added to the server first because it needs to run at start to attach the
    // lifecycle used by other stuff.
    fastify.addHook('onRequest', (req, reply, done) => {
      const requestLc = new LifecycleInstance(HTTP_REQUEST, this.lifecycleInstance, this.logger);
      req.log = (req.log as Logger).child({ component: 'RequestLogger' });

      // As the id might not be generated, let's stuff it back into the request, as well as the reply
      req.headers[fastifyRequestIdHeader] = req.id;
      reply.header(fastifyRequestIdHeader, req.id);

      // These will be stashed in the request-scoped injector so that
      requestLc
        .registerTemporary(REQUEST, req)
        .registerTemporary(REPLY, reply)
        .registerTemporary(LOGGER, req.log)
        .registerTemporary(DEPENDENCY_LIFECYCLE, requestLc);

      req.$stockade = {
        lifecycleInstance: requestLc,
      };

      done();
    });

    if (this._options.fastify?.preConfigure) {
      this.logger.debug('Running Fastify preconfigure.');
      this._options.fastify.preConfigure(fastify);
    }

    this._bindFastifyHooks(fastify);
    this._bindRoutesToControllers(fastify);

    if (this._options.fastify?.postConfigure) {
      this.logger.debug('Running Fastify postconfigure.');
      this._options.fastify.postConfigure(fastify);
    }

    return fastify;
  }

  private _bindFastifyHooks(fastify: Fastify.FastifyInstance): void {
    const hooks = extractHooks(this._allHooks);
    this._bindOnRequestHooks(fastify, hooks.onRequest);
    this._bindPreParsingHooks(fastify, hooks.preParsing);
    this._bindPreValidationHooks(fastify, hooks.preValidation);
    this._bindPreHandlerHooks(fastify, hooks.preValidation);
    this._bindPreSerializationHooks(fastify, hooks.preSerialization);
    this._bindOnErrorHooks(fastify, hooks.onError);
    this._bindOnSendHooks(fastify, hooks.onSend);
    this._bindOnResponseHooks(fastify, hooks.onResponse);
  }

  private _bindOnRequestHooks(
    fastify: Fastify.FastifyInstance,
    hooks: ReadonlyArray<[IFastifyHookDefinition, Domain<IModule>]>,
  ): void {
    for (const [hook, resolvingDomain] of hooks) {
      const hookClassName = hook.class.name;
      const domainName = resolvingDomain.name;
      const logger = this.logger.child({ hookClassName, domainName });

      logger.info(`onRequest: binding '${hookClassName}' from domain '${domainName}'.`);
      fastify.addHook('onRequest', async (req, reply) => {
        const lifecycle: LifecycleInstance = req.$stockade.lifecycleInstance;
        const hookInstance = await lifecycle.instantiate(hook.class, resolvingDomain);

        req.log.trace({ hookClassName }, 'Firing onRequest.');

        return (hookInstance as IOnRequestHook).onRequest(req, reply);
      });
    }
  }

  private _bindPreParsingHooks(
    fastify: Fastify.FastifyInstance,
    hooks: ReadonlyArray<[IFastifyHookDefinition, Domain<IModule>]>,
  ): void {
    for (const [hook, resolvingDomain] of hooks) {
      const hookClassName = hook.class.name;
      const domainName = resolvingDomain.name;
      const logger = this.logger.child({ hookClass: hookClassName, domainName });

      logger.info(`preParsing: binding '${hookClassName}' from domain '${domainName}'.`);
      fastify.addHook('preParsing', async (req, reply) => {
        const lifecycle: LifecycleInstance = req.$stockade.lifecycleInstance;
        const hookInstance = await lifecycle.instantiate(hook.class, resolvingDomain);

        req.log.trace({ hookClassName }, 'Firing preParsing.');

        return (hookInstance as IPreParsingHook).preParsing(req, reply);
      });
    }
  }

  private _bindPreValidationHooks(
    fastify: Fastify.FastifyInstance,
    hooks: ReadonlyArray<[IFastifyHookDefinition, Domain<IModule>]>,
  ): void {
    for (const [hook, resolvingDomain] of hooks) {
      const hookClassName = hook.class.name;
      const domainName = resolvingDomain.name;
      const logger = this.logger.child({ hookClass: hookClassName, domainName });

      logger.info(`preValidation: binding '${hookClassName}' from domain '${domainName}'.`);
      fastify.addHook('preValidation', async (req, reply) => {
        const lifecycle: LifecycleInstance = req.$stockade.lifecycleInstance;
        const hookInstance = await lifecycle.instantiate(hook.class, resolvingDomain);

        req.log.trace({ hookClassName }, 'Firing preValidation.');

        return (hookInstance as IPreValidationHook).preValidation(req, reply);
      });
    }
  }

  private _bindPreHandlerHooks(
    fastify: Fastify.FastifyInstance,
    hooks: ReadonlyArray<[IFastifyHookDefinition, Domain<IModule>]>,
  ): void {
    for (const [hook, resolvingDomain] of hooks) {
      const hookClassName = hook.class.name;
      const domainName = resolvingDomain.name;
      const logger = this.logger.child({ hookClass: hookClassName, domainName });

      logger.info(`preHandler: binding '${hookClassName}' from domain '${domainName}'.`);
      fastify.addHook('preHandler', async (req, reply) => {
        const lifecycle: LifecycleInstance = req.$stockade.lifecycleInstance;
        const hookInstance = await lifecycle.instantiate(hook.class, resolvingDomain);

        req.log.trace({ hookClassName }, 'Firing preHandler.');

        return (hookInstance as IPreHandlerHook).preHandler(req, reply);
      });
    }
  }

  private _bindPreSerializationHooks(
    fastify: Fastify.FastifyInstance,
    hooks: ReadonlyArray<[IFastifyHookDefinition, Domain<IModule>]>,
  ): void {
    for (const [hook, resolvingDomain] of hooks) {
      const hookClassName = hook.class.name;
      const domainName = resolvingDomain.name;
      const logger = this.logger.child({ hookClass: hookClassName, domainName });

      logger.info(`preSerialization: binding '${hookClassName}' from domain '${domainName}'.`);
      fastify.addHook('preSerialization', async (req, reply, payload) => {
        const lifecycle: LifecycleInstance = req.$stockade.lifecycleInstance;
        const hookInstance = await lifecycle.instantiate(hook.class, resolvingDomain);

        req.log.trace({ hookClassName }, 'Firing preSerialization.');

        return (hookInstance as IPreSerializationHook).preSerialization(req, reply, payload);
      });
    }
  }

  private _bindOnErrorHooks(
    fastify: Fastify.FastifyInstance,
    hooks: ReadonlyArray<[IFastifyHookDefinition, Domain<IModule>]>,
  ): void {
    for (const [hook, resolvingDomain] of hooks) {
      const hookClassName = hook.class.name;
      const domainName = resolvingDomain.name;
      const logger = this.logger.child({ hookClass: hookClassName, domainName });

      logger.info(`onError: binding '${hookClassName}' from domain '${domainName}'.`);
      fastify.addHook('onError', async (req, reply, error) => {
        const lifecycle: LifecycleInstance = req.$stockade.lifecycleInstance;
        const hookInstance = await lifecycle.instantiate(hook.class, resolvingDomain);

        req.log.trace({ hookClassName }, 'Firing onError.');

        return (hookInstance as IOnErrorHook).onError(req, reply, error);
      });
    }
  }

  private _bindOnSendHooks(
    fastify: Fastify.FastifyInstance,
    hooks: ReadonlyArray<[IFastifyHookDefinition, Domain<IModule>]>,
  ): void {
    for (const [hook, resolvingDomain] of hooks) {
      const hookClassName = hook.class.name;
      const domainName = resolvingDomain.name;
      const logger = this.logger.child({ hookClass: hookClassName, domainName });

      logger.info(`onSend: binding '${hookClassName}' from domain '${domainName}'.`);
      fastify.addHook('onSend', async (req, reply, payload) => {
        const lifecycle: LifecycleInstance = req.$stockade.lifecycleInstance;
        const hookInstance = await lifecycle.instantiate(hook.class, resolvingDomain);

        req.log.trace({ hookClassName }, 'Firing onSend.');

        return (hookInstance as IOnSendHook).onSend(req, reply, payload);
      });
    }
  }

  private _bindOnResponseHooks(
    fastify: Fastify.FastifyInstance,
    hooks: ReadonlyArray<[IFastifyHookDefinition, Domain<IModule>]>,
  ): void {
    for (const [hook, resolvingDomain] of hooks) {
      const hookClassName = hook.class.name;
      const domainName = resolvingDomain.name;
      const logger = this.logger.child({ hookClass: hookClassName, domainName });

      logger.info(`onResponse: binding '${hookClassName}' from domain '${domainName}'.`);
      fastify.addHook('onResponse', async (req, reply) => {
        const lifecycle: LifecycleInstance = req.$stockade.lifecycleInstance;
        const hookInstance = await lifecycle.instantiate(hook.class, resolvingDomain);

        req.log.trace({ hookClassName }, 'Firing onResponse.');

        return (hookInstance as IOnResponseHook).onResponse(req, reply);
      });
    }
  }

  private _bindRoutesToControllers(fastifyBase: Fastify.FastifyInstance): void {
    // TODO:  Take all controllers and route them
    console.log(require('util').inspect(this._allControllers, false, null, true));
    for (const controllerInfo of this._allControllers) {
      const controller = controllerInfo.controller;
      const controllerName = controller.name;
      const cLogger = this.logger.child({ controllerName });
      cLogger.debug(`Registering Fastify module for '${controllerName}'.`);

      // Each controller will be loaded as a separate Fastify module.
      fastifyBase.register(async (fastify) => {
        if (controller.onRegisterStart) {
          cLogger.trace('Calling user-defined onRegisterStart.');
          controller.onRegisterStart(fastify);
        }

        const controllerPathBase = controllerInfo[AnnotationKeys.CONTROLLER_INFO].basePath;

        for (const [handlerName, endpointInfo] of Object.entries(controllerInfo.endpoints)) {
          const eLogger = cLogger.child({ handlerName });
          if (controller.onEndpointRegisterStart) {
            eLogger.trace('Calling user-defined onEndpointRegisterStart.');
            controller.onEndpointRegisterStart(fastify, handlerName, endpointInfo);
          }

          const endpointPath = endpointInfo[AnnotationKeys.ROUTE_PATH];
          const endpointOptions = endpointInfo[AnnotationKeys.ROUTE_OPTIONS];
          const method = endpointInfo[AnnotationKeys.ROUTE_METHOD];
          const url = `/${stripPathSlashes(controllerPathBase)}/${stripPathSlashes(endpointPath)}`;

          const endpointParameterResolvers: Array<IParameterResolver> =
            extractParameterResolversFromParameters(endpointInfo);

          eLogger.debug({ method, url }, `Defining route ${method} ${url}.`);
          fastify.route({
            method,
            url,
            handler: async (request, reply) => {
              const hLogger = (request.log as Logger).child({ controllerName, handlerName });
              const lifecycle: LifecycleInstance = request.$stockade.lifecycleInstance;

              lifecycle.registerTemporary(LOGGER, hLogger);

              const controllerInstance = await lifecycle.instantiate(
                controllerInfo.controller,
                controllerInfo.domain,
              );

              // applying IMethodOptions#returnHeaders
              for (const [headerName, value] of Object.entries(endpointOptions.returnHeaders ?? {})) {
                reply.header(headerName, value);
              }

              // resolving arguments to pass to method
              const handlerArguments: Array<any> = await Promise.all(
                endpointParameterResolvers.map(
                  r => lifecycle.executeFunctional(controllerInfo.domain, r.inject, r.fn),
                ),
              );

              // invoking handler method with extracted parameters
              const ret = await (controllerInstance[handlerName] as any)(...handlerArguments);

              if (!endpointOptions.manualReturn) {
                // happy path return: do the presumably right thing with the returned data
                if (endpointOptions.returnCode) {
                  reply.status(endpointOptions.returnCode);
                }

                return ret;
              // tslint:disable-next-line: unnecessary-else
              } else {
                if (typeof(ret) !== 'undefined') {
                  hLogger.warn(`Method is flagged for manual return (\`reply.send()\`) but returned non-undefined: ${ret}`);
                }

                return 'if you are seeing this, somebody forgot to reply.send()';
              }
            },
          });

          if (controller.onEndpointRegisterEnd) {
            eLogger.trace('Calling user-defined onEndpointRegisterEnd.');
            controller.onEndpointRegisterEnd(fastify, handlerName, endpointInfo);
          }
        }

        if (controller.onRegisterEnd) {
          cLogger.trace('Calling user-defined onRegisterEnd.');
          controller.onRegisterEnd(fastify);
        }
      });
    }
  }
}

function extractParameterResolversFromParameters(
  endpointInfo: IMappedEndpointDetailed,
): Array<IParameterResolver> {
  if (!endpointInfo.parameters) {
    return [];
  }

  const ret: Array<IParameterResolver> = [];
  for (const [idx, parameter] of endpointInfo.parameters) {
    const resolver = parameter['@stockade/http:PARAMETER_RESOLVER'];
    if (!resolver) {
      throw new Error(
        `Endpoint '${endpointInfo.handlerName}' in controller '${endpointInfo.controller.name}' ` +
        `is missing a parameter resolver for index: ${idx}`,
      );
    }

    ret[idx] = resolver;
  }

  return ret;
}

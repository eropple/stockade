import { Class } from 'utility-types';

import { IModule, isStockadeModule } from '@stockade/core';

import { IFastifyHookDefinitionArg } from './hooks';

export interface IHttpModule extends IModule {
  $isStockadeHttpModule: true;

  /**
   * Specifies HTTP endpoint controllers to be hoisted into the router.
   * Any classes in this array must implement the `@Controller()` decorator
   * or a runtime exception will be thrown.
   */
  controllers?: ReadonlyArray<Class<any>>;

  /**
   * Specifies classes that implement Fastify hooks. Fastify hooks touch on
   * many parts of the request lifecycle and this provides them with dependency
   * injection.
   *
   * TODO: Find a good stable sort for these.
   */
  hooks?: ReadonlyArray<IFastifyHookDefinitionArg>;
}

export function isHttpModule(m: unknown): m is IHttpModule {
  return isStockadeModule(m) && (m as any).$isStockadeHttpModule;
}

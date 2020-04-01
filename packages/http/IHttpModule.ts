import { Class } from 'utility-types';

import { IModule, isStockadeModule } from '@stockade/core';

import { IFastifyHookDefinitionArg } from './hooks';
import { ControllerClass } from './types';

/**
 * Superset of the standard Stockade module in order to extend it for HTTP.
 */
export interface IHttpModule extends IModule {
  $isStockadeHttpModule: true;

  /**
   * Specifies HTTP endpoint controllers to be hoisted into the router.
   * Any classes in this array must implement the `@Controller()` decorator
   * or a runtime exception will be thrown.
   */
  controllers?: ReadonlyArray<ControllerClass>;

  /**
   * Specifies classes that implement Fastify hooks. Fastify hooks touch on
   * many parts of the request lifecycle and this provides them with dependency
   * injection. You can find interfaces that let you implement these hooks in
   * `packages/http/hooks/fastify-hook-interfaces.ts`.
   *
   * @see [IOnRequestHook]
   * @see [IPreParsingHook]
   * @see [IPreValidationHook]
   * @see [IPreSerializationHook]
   * @see [IOnErrorHook]
   * @see [IOnSendHook]
   * @see [IOnResponseHook]
   */
  hooks?: ReadonlyArray<IFastifyHookDefinitionArg>;
}

export function isHttpModule(m: unknown): m is IHttpModule {
  return isStockadeModule(m) && (m as any).$isStockadeHttpModule;
}

import { Class } from 'utility-types';

import {
  IOnErrorHook,
  IOnRequestHook,
  IOnResponseHook,
  IOnSendHook,
  IPreParsingHook,
  IPreSerializationHook,
  IPreValidationHook,
} from './fastify-hook-interfaces';

export * from './fastify-hook-interfaces';

export type FastifyHookClass =
  | Class<IOnRequestHook>
  | Class<IPreParsingHook>
  | Class<IPreValidationHook>
  | Class<IPreSerializationHook>
  | Class<IOnErrorHook>
  | Class<IOnSendHook>
  | Class<IOnResponseHook>
  ;

export interface IFastifyHookDefinition {
  weight?: number;
  class: FastifyHookClass;
}

export type IFastifyHookDefinitionArg = IFastifyHookDefinition | Class<any>;

import { Class } from 'utility-types';

export * from './fastify-hook-interfaces';

export interface IFastifyHookDefinition {
  weight?: number;
  class: Class<any>;
}

export type IFastifyHookDefinitionArg = IFastifyHookDefinition | Class<any>;

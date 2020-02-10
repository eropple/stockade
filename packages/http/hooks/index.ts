import { Class } from 'utility-types';

export interface IFastifyHookDefinition {
  weight?: number;
  class: Class<any>;
}

export type IFastifyHookDefinitionArg = IFastifyHookDefinition | Class<any>;

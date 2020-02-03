import { Class } from 'utility-types';

export interface IInterceptorDefinition {
  weight?: number;
  class: Class<any>;
}

export type IInterceptorDefinitionArg = IInterceptorDefinition | Class<any>;

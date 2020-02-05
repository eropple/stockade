import { Class } from 'utility-types';

import './__module';

import { IInterceptorDefinitionArg } from '../interceptors';

declare module '@stockade/core' {
  class ModuleBuilderBase<TModule extends IModule> {
    readonly mod: TModule;

    /**
     * @see {IModule.controllers}
     * @param c The controllers to register
     */
    controllers(...c: Array<Class<any>>): this;

    /**
     * @see {IModule.interceptors}
     * @param i The interceptors to register
     */
    interceptors(...i: Array<IInterceptorDefinitionArg>): this;
  }
}

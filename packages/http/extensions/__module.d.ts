export declare module '@stockade/core' {
  export interface IModule {
    /**
     * Specifies HTTP endpoint controllers to be hoisted into the router.
     * Any classes in this array must implement the `@Controller()` decorator
     * or a runtime exception will be thrown.
     */
    controllers?: Array<Class<any>>;

    /**
     * Specifies HTTP interceptors to be registered into the router. Interceptors
     * will be called in _weighted_ order; interceptors that are specified without
     * a weight have a default weight of 0 and so will be sorted in order of appending
     * (uses a stable sort).
     *
     * TODO: Find a good stable sort for these.
     */
    interceptors?: Array<IInterceptorDefinitionArg>;
  }

  export class ModuleBuilderBase<TModule extends IModule> {
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

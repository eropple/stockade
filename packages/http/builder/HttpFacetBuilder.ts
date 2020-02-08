import { Class } from 'utility-types';

import { FacetBuilderBase, IAppSpec, IModule } from '@stockade/core';

import { IInterceptorDefinitionArg } from '../interceptors';

export abstract class HttpFacetBuilderBase<
  TModule extends IModule,
> extends FacetBuilderBase<TModule> {
  protected _controllers: ReadonlyArray<Class<any>> = [];
  protected _interceptors: ReadonlyArray<IInterceptorDefinitionArg> = [];

  controllers(...c: Array<Class<any>>): this {
    this._controllers = [...this._controllers, ...c];

    return this;
  }

  interceptors(...i: Array<IInterceptorDefinitionArg>): this {
    this._interceptors = [...this._interceptors, ...i];

    return this;
  }

  abstract transform(m: TModule): TModule;
}

// TODO: figure out how to better unify this

export class HttpModuleFacetBuilder extends HttpFacetBuilderBase<IModule> {
  transform(m: IModule) {
    return { ...m, controllers: this._controllers, interceptors: this._interceptors };
  }
}

export class HttpAppSpecFacetBuilder extends HttpFacetBuilderBase<IAppSpec> {
  transform(m: IAppSpec) {
    return { ...m, controllers: this._controllers, interceptors: this._interceptors };
  }
}

export function Http(): HttpModuleFacetBuilder {
  return new HttpModuleFacetBuilder();
}

export function HttpApp(): HttpAppSpecFacetBuilder {
  return new HttpAppSpecFacetBuilder();
}

import { Class } from 'utility-types';

import { FacetBuilderBase } from '@stockade/core/spec/FacetBuilderBase';
import { IAppSpec, IModule } from '@stockade/core/spec/IModule';

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

  transform(m: TModule): TModule {
    // TODO:  this is the first time I've ever used @ts-ignore and it shouldn't be
    //        I can't for the life of me tell what the problem here is, but it's
    //        something to do with my module augmentation.
    return {
      ...m,
      // @ts-ignore
      controllers: this._controllers.length > 0 ? this._controllers : undefined,
      interceptors: this._interceptors.length > 0 ? this._interceptors : undefined,
    };
  }
}
export class HttpModuleFacetBuilder extends HttpFacetBuilderBase<IModule> {
}

export class HttpAppSpecFacetBuilder extends HttpFacetBuilderBase<IAppSpec> {
}

export function Http(): HttpModuleFacetBuilder {
  return new HttpModuleFacetBuilder();
}

export function HttpApp(): HttpAppSpecFacetBuilder {
  return new HttpAppSpecFacetBuilder();
}

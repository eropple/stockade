import { FacetSpecBuilderBase } from '@stockade/core';
import { IAppSpec, IModule } from '@stockade/core/spec/IModule';

import { IFastifyHookDefinitionArg } from '../hooks';
import { IHttpModule } from '../IHttpModule';
import { ControllerClass } from '../types';

export abstract class HttpFacetSpecBuilderBase<
  TModule extends IModule,
> extends FacetSpecBuilderBase<TModule> {
  protected _controllers: ReadonlyArray<ControllerClass> = [];
  protected _hooks: ReadonlyArray<IFastifyHookDefinitionArg> = [];

  controllers(...c: Array<ControllerClass>): this {
    this._controllers = [...this._controllers, ...c];

    return this;
  }

  hooks(...h: Array<IFastifyHookDefinitionArg>): this {
    this._hooks = [...this._hooks, ...h];

    return this;
  }

  transform(m: TModule): (TModule & IHttpModule) {
    // TODO:  this is the first time I've ever used @ts-ignore and it shouldn't be
    //        I can't for the life of me tell what the problem here is, but it's
    //        something to do with my module augmentation.
    const ret: TModule & IHttpModule = {
      ...m,
      $isStockadeHttpModule: true,
    };

    if (this._controllers.length > 0) {
      ret.controllers = this._controllers;
    }

    if (this._hooks.length > 0) {
      ret.hooks = this._hooks;
    }

    return ret;
  }
}
export class HttpModuleFacetBuilder extends HttpFacetSpecBuilderBase<IModule> {
}

export class HttpAppSpecFacetBuilder extends HttpFacetSpecBuilderBase<IAppSpec> {
}

export function Http(): HttpModuleFacetBuilder {
  return new HttpModuleFacetBuilder();
}

export function HttpApp(): HttpAppSpecFacetBuilder {
  return new HttpAppSpecFacetBuilder();
}

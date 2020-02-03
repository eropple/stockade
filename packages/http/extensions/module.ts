import { Class } from 'utility-types';

import { IModule, ModuleBuilderBase } from '@stockade/core';

import { IInterceptorDefinitionArg } from '../interceptors';
import './__module';

ModuleBuilderBase.prototype.controllers =
  function<TModule extends IModule>(
    this: ModuleBuilderBase<TModule>,
    ...c: Array<Class<any>>
  ) {
    this.mod.controllers = this.mod.controllers ?? [];
    this.mod.controllers.push(...c);

    return this;
  };

ModuleBuilderBase.prototype.interceptors =
  function<TModule extends IModule>(
    this: ModuleBuilderBase<TModule>,
    ...i: Array<IInterceptorDefinitionArg>
  ) {
    this.mod.interceptors = this.mod.interceptors ?? [];
    this.mod.interceptors.push(...i);

    return this;
  };

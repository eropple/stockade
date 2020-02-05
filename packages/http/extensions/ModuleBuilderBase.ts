import { Class } from 'utility-types';

import { IModule, ModuleBuilderBase } from '@stockade/core';

import { IInterceptorDefinitionArg } from '../interceptors';
import './__module';

// These prototypes have to cast `this` so we can get access to
// the private `mod` instance. Which is a shame. But we can
// consider it privileged here.

(ModuleBuilderBase.prototype as any).controllers =
  function<TModule extends IModule>(
    this: ModuleBuilderBase<TModule>,
    ...c: Array<Class<any>>
  ) {
    (this as any).mod.controllers = (this as any).mod.controllers ?? [];
    (this as any).mod.controllers.push(...c);

    return this;
  };

(ModuleBuilderBase.prototype as any).interceptors =
  function<TModule extends IModule>(
    this: ModuleBuilderBase<TModule>,
    ...i: Array<IInterceptorDefinitionArg>
  ) {
    (this as any).mod.interceptors = (this as any).mod.interceptors ?? [];
    (this as any).mod.interceptors.push(...i);

    return this;
  };

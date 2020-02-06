import { Class } from 'utility-types';

import {
  IModule,
  IAppSpec,
} from '@stockade/core';
import { IDomainDefinition } from '@stockade/inject';

import { IInterceptorDefinitionArg } from '../interceptors';

// THIS IS EXTREMELY IMPORTANT
// TypeScript module augmentation is extremely touchy. If you don't precisely
// redeclare the signature of an interface or class, it will just shadow your
// original. This stinks and sucks and should probably not be allowed, but
// there you have it.
//
// In the case below:
// -  `interface IModule` will shadow
// -  `interface IModule extends IDomainDefinition` will _not_ throw and error
//    if you do not import both `IModule` (ok...) and `IDomainDefinition` (WTF?)
declare module '@stockade/core' {
  export interface IModule extends IDomainDefinition {
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

  export interface IAppSpec extends IModule {

  }
}





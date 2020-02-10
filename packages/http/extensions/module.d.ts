import { Class } from 'utility-types';

import {
  IModule,
  IAppSpec,
} from '@stockade/core';
import { IDomainDefinition } from '@stockade/inject';

import { IFastifyHookDefinitionArg } from '../hooks';

// THIS IS EXTREMELY IMPORTANT
// TypeScript module augmentation is extremely touchy. If you don't precisely
// redeclare the signature of an interface or class, it will just shadow your
// original. This stinks and sucks and should probably not be allowed, but
// there you have it.
//
// In the case below:
// -  `interface IModule` will shadow
// -  `interface IModule extends IDomainDefinition` will _not_ throw and error
//    if you do not import both `IModule` (ok...) and `IDomainDefinition` (WTF?),
//    and will just overwrite the declaration
declare module '@stockade/core' {
  export interface IModule extends IDomainDefinition {
    /**
     * Specifies HTTP endpoint controllers to be hoisted into the router.
     * Any classes in this array must implement the `@Controller()` decorator
     * or a runtime exception will be thrown.
     */
    controllers?: ReadonlyArray<Class<any>>;

    /**
     * Specifies classes that implement Fastify hooks. Fastify hooks touch on
     * many parts of the request lifecycle and this provides them with dependency
     * injection.
     *
     * TODO: Find a good stable sort for these.
     */
    hooks?: ReadonlyArray<IFastifyHookDefinitionArg>;
  }
}





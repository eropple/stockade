import { Class } from 'utility-types';

import { ILifecycle, SINGLETON } from '../lifecycle';
import { DependencyKey } from './dependency-utils';
import { IClassProviderDefinition, IFactoryProviderDefinition, IValueProviderDefinition, PromiseOr } from './types';

// tslint:disable-next-line: interface-over-type-literal
export type ToFactoryArgs<T = any> =
  { inject: Array<DependencyKey>, fn: (...args: Array<any>) => PromiseOr<T> };

export interface IProviderBuildTerminal {
  toValue<T = any>(value: T): IValueProviderDefinition<T>;
  toClass<T = any>(cls: Class<T>): IClassProviderDefinition<T>;
  toFactory<T = any>(args: ToFactoryArgs<T>): IFactoryProviderDefinition<T>;
}

export class ProviderDefinitionKeyHelper implements IProviderBuildTerminal {
  constructor(readonly key: DependencyKey) {}

  in(lifecycle: ILifecycle) {
    return new ProviderDefinitionKeyLifecycleHelper(lifecycle, this.key);
  }

  toValue<T = any>(value: T): IValueProviderDefinition<T> {
    return this.in(SINGLETON).toValue(value);
  }
  toClass<T = any>(cls: Class<T>): IClassProviderDefinition<T> {
    return this.in(SINGLETON).toClass(cls);
  }
  toFactory<T = any>(args: ToFactoryArgs<T>): IFactoryProviderDefinition<T> {
    return this.in(SINGLETON).toFactory(args);
  }
}

export class ProviderDefinitionKeyLifecycleHelper implements IProviderBuildTerminal {
  constructor(readonly lifecycle: ILifecycle, readonly key: DependencyKey) {}

  toValue<T = any>(value: T): IValueProviderDefinition<T> {
    return { key: this.key, value, lifecycle: this.lifecycle };
  }

  toClass<T = any>(cls: Class<T>): IClassProviderDefinition<T> {
    return { key: this.key, class: cls, lifecycle: this.lifecycle };
  }

  // TODO: can this be genericized intelligently? (probably not tbh)
  toFactory<T = any>(args: ToFactoryArgs<T>): IFactoryProviderDefinition<T> {
    return { key: this.key, lifecycle: this.lifecycle, inject: args.inject, fn: args.fn };
  }
}

export function bind(key: DependencyKey) {
  return new ProviderDefinitionKeyHelper(key);
}

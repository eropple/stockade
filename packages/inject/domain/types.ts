import { Class } from 'utility-types';

import { ILifecycle, LifecycleInstance, SINGLETON } from '../lifecycle';
import { DependencyKey } from './dependency-utils';
import { Domain } from './Domain';

export type PromiseOr<T> = T | Promise<T>;

export interface IProviderDefinitionBase {
  key: DependencyKey;
  lifecycle?: ILifecycle;
}

export type DynamicProviderFn =
  (d: Domain, key: symbol, lifecycle: LifecycleInstance, exported: boolean) =>
    IProviderDefinition | null | Promise<IProviderDefinition | null>;

/**
 * This provider specifies a static value for a specific dependency key.
 */
export interface IValueProviderDefinition<T = any> extends IProviderDefinitionBase {
  value: T;
}

/**
 * This provider specifies an otherwise autoinjectable class by a specific
 * dependency key.
 */
export interface IClassProviderDefinition<T = any> extends IProviderDefinitionBase {
  class: Class<T>;
}

/**
 * This provider specifies a function, with optional injected parameters, that
 * can be used to build the requested object.
 *
 * TODO: this can probably be smartened up with some flavor of generics?
 */
export interface IFactoryProviderDefinition<T = any> extends IProviderDefinitionBase {
  inject?: Array<DependencyKey>;
  fn: (...args: Array<any>) => PromiseOr<T>;
}

export type IProviderDefinition<T = any> =
  | IValueProviderDefinition<T>
  | IClassProviderDefinition<T>
  | IFactoryProviderDefinition<T>;

export function isValueProviderDefinition(t: any): t is IValueProviderDefinition<any> {
  return (!!t.key && typeof(t.value) !== 'undefined');
}

export function isClassProviderDefinition(t: any): t is IClassProviderDefinition<any> {
  return (!!t.key && typeof(t.class) === 'function');
}

export function isFactoryProviderDefinition(t: any): t is IFactoryProviderDefinition<any> {
  return (!!t.key && typeof(t.fn) === 'function');
}

/**
 * The normalized version of an `ImportDefinition`, provided by the `Domain` object.
 */
export interface IDomainImport {
  key: symbol;
  lifecycle: ILifecycle;
  optional: boolean;
}

/**
 * The normalized version of an `ExportDefinition`, provided by the `Domain` object.
 */
export interface IDomainExport {
  key: symbol;
  lifecycle: ILifecycle;
}

export interface IDomainProviderBase {
  key: symbol;
  lifecycle: ILifecycle;
}

export interface IDomainValueProvider<T = any> extends IDomainProviderBase {
  value: T;
}

export interface IDomainFactoryProvider<T = any> extends IDomainProviderBase {
  inject: Array<symbol>;
  fn: (...args: Array<any>) => PromiseOr<T>;
  extractedFromAutoComponent: boolean;
}

export function isDomainProvider(o: any): o is DomainProvider {
  return !!(o as IDomainProviderBase).key && !!(o as IDomainProviderBase).lifecycle;
}

export function isDomainValueProvider(o: any): o is IDomainValueProvider {
  return isDomainProvider(o) && !!(o as any).value;
}

export function isDomainFactoryProvider(o: any): o is IDomainFactoryProvider {
  return isDomainProvider(o) && !!(o as any).inject && !!(o as any).fn;
}

/**
 * The normalized version of an `IProviderDefinition`, provided by the `Domain` object.
 * Stockade's injector, to simplify runtime access, converts an `IClassProviderDefinition`
 * into an `IDomainFactoryProvider`.
 */
export type DomainProvider<T = any> =
  | IDomainValueProvider<T>
  | IDomainFactoryProvider<T>;

// tslint:disable-next-line: interface-over-type-literal
export type ResolutionKey = { key: symbol; lifecycleKey: symbol; };

// tslint:disable-next-line: interface-over-type-literal
export type ImportDefinition = { key: DependencyKey, lifecycle?: ILifecycle, optional: boolean };
// tslint:disable-next-line: interface-over-type-literal
export type ExportDefinition = { key: DependencyKey, lifecycle?: ILifecycle };

export function isImportDefinition(o: any): o is ImportDefinition {
  return !!o.key && !!o.optional;
}

export function isExportDefinition(o: any): o is ExportDefinition {
  return !!o.key && !!o.lifecycle;
}

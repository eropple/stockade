import { GLOBAL_LIFECYCLE_NAME, SINGLETON_LIFECYCLE_NAME } from './names';

export interface ILifecycle {
  readonly name: symbol;
  readonly aliases: ReadonlyArray<symbol>;
  readonly parent: ILifecycle | null;
}

export function isLifecycle(t: any): t is ILifecycle {
  return !!t.name && (t.parent ? isLifecycle(t.parent) : true);
}

/**
 * Indicates that something is being created at a facet level. For example, an
 * individual object should be created for a HTTP facet and a Redis Job facet,
 * even if they're being executed by the same Runner.
 */
export const FACET: symbol = Symbol.for(`@stockade/inject:LifecycleAliases:FACET`);

/**
 * Indicates that something is being created at a level that's triggered by
 * _something_ happening to a facet. For example, the `HTTP_REQUEST` lifecycle is
 * also a `SUB_FACET` lifecycle.
 */
export const SUB_FACET: symbol = Symbol.for(`@stockade/inject:LifecycleAliases:SUB_FACET`);

export const GLOBAL: ILifecycle = { name: Symbol.for(GLOBAL_LIFECYCLE_NAME), parent: null, aliases: [] };
export const SINGLETON: ILifecycle = { name: Symbol.for(SINGLETON_LIFECYCLE_NAME), parent: GLOBAL, aliases: [] };

import { GLOBAL_LIFECYCLE_NAME, SINGLETON_LIFECYCLE_NAME } from './names';

export interface ILifecycle {
  readonly name: symbol;
  readonly parent: ILifecycle | null;
}

export function isLifecycle(t: any): t is ILifecycle {
  return !!t.name && (t.parent ? isLifecycle(t.parent) : true);
}

export const GLOBAL: ILifecycle = { name: Symbol.for(GLOBAL_LIFECYCLE_NAME), parent: null };
export const SINGLETON: ILifecycle = { name: Symbol.for(SINGLETON_LIFECYCLE_NAME), parent: GLOBAL };

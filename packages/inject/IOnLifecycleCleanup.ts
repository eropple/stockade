/**
 * Any provided object that implements this interface (which is duck-typed;
 * Stockade looks for a function called `onLifecycleCleanup`) will have it
 * called when a lifecycle ends. This can then be used by resource providers,
 * etc. to return the resource (for example, a database connection can be
 * returned to a pool, or a database connection pool can be closed).
 *
 * **NOTE:** Objects in the `GLOBAL` lifecycle are not guaranteed to ever
 * be cleaned up.
 *
 * **ALSO NOTE:** Cleanup will be done in iterative order. The last created
 * will be the first cleaned up.
 */
export interface IOnLifecycleCleanup {
  onLifecycleCleanup(): Promise<void>;
}

export function hasLifecycleCleanup(o: any): o is IOnLifecycleCleanup {
  return typeof(o?.onLifecycleCleanup) === 'function';
}

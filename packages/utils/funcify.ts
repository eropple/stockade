/**
 * A `Funcifiable<T>` is either `T` or a function that
 * returns `T`. It will explode with a great thunder if
 * you attempt to do `Funcifiable<() => U>`, where `U`
 * is anything at all. (Otherwise you could do silly
 * things that I don't want to typecheck against.)
 */
export type Funcifiable<T> =
  T | Exclude<() => T, () => () => T>;

export function funcify<T>(v: Funcifiable<T>): T {
  if (typeof(v) === 'function') {
    return (v as any)();
  }

  return v;
}

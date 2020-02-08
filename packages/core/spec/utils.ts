import { IModule } from './IModule';

/**
 * Iterates over a module tree (or subtree, depending on where you start)
 * and returns values for every module found in the tree. They will be
 * flattened into a single list.
 *
 * TODO: make iterative rather than recursive (performance)
 *
 * @param root
 * @param fn
 */
export function mapModules<TReturn>(
  root: IModule,
  fn: (m: IModule) => TReturn | Array<TReturn>,
): Array<TReturn> {
  const ret: Array<TReturn> = [fn(root)].flat(Infinity);

  (root.children ?? []).forEach(ch => {
    ret.concat(...mapModules(ch, fn));
  });

  return ret;
}

import {
  Class,
} from 'utility-types';

import { getAutoComponentMetadataOrFail } from '../annotations/auto-component.decorator';

/**
 * For ease of use, Stockade allows developers to specify dependencies in
 * multiple ways. It's usually easier for a developer to do something like
 *
 * ```ts
 * @Inject(MyClass)
 * ```
 *
 * instead of
 *
 * ```ts
 * @Inject("MyClass")
 * ```
 *
 * To this end, `DependencyKey` strictly defines all legal ways to specify
 * the "injector name" of the dependency. This will be normalized into a
 * globally shared symbol (via `Symbol.for`) when it is converted into a
 * `Domain`.
 *
 * @see keyFor
 * @see Symbol.for
 */
export type DependencyKey = string | symbol | Class<any>;

/**
 * Resolves a user's dependency key to a canonical one.
 *
 * @param key the dependency key (class, name, etc.)
 */
export function forKey(key: DependencyKey): symbol {
  switch (typeof(key)) {
    case 'string':
      return Symbol.for(key);
    case 'function':
      // assumed to be a class constructor
      const autoComponentMetadata = getAutoComponentMetadataOrFail(key);

      return Symbol.for(autoComponentMetadata.key || key.name);
    case 'symbol':
      // Most people misunderstand symbols in JavaScript/TypeScript and they
      // export them directly out of libraries. This is usually a Bad Idea,
      // because if you're doing development with `yarn link` or have some
      // slightly out-of-whack dependencies, you might run into the situation
      // where a dependency is exporting a symbol that is _different_ from one
      // expected by another copy of the same dependency.
      //
      // Moral of the story: always use `Symbol.for()` unless you know for a
      // fact that you want _that particular instance_ of a symbol to be
      // completely unique even across different versions of the same JS module.
      if (!key.description) {
        throw new Error('Symbols must have descriptions.');
      }

      return Symbol.for(key.description);
  }
}

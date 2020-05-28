import { Class } from 'utility-types';

import { DependencyKey } from './dependency-utils';
import { ExportDefinition, ImportDefinition, IProviderDefinition } from './types';

/**
 * A nested tree of `IDomainDefinition`s will be hydrated by the injector into a
 * nested tree of `Domain`s.
 */
export interface IDomainDefinition {
  /**
   * The human-friendly name of this domain. Each definition may only have _one_
   * child definition with any given name, as the definitions will be
   * concatenated to uniquely identify a given domain.
   */
  readonly name: string;

  /**
   * The set of domains that are children of this one. They will be resolved to
   * `Domain`s before this definition is.
   */
  readonly children?: ReadonlyArray<IDomainDefinition>;

  /**
   * Dependencies that are required by this domain. The parent domain must
   * satisfy all of these dependencies within any given lifecycle in which it is
   * resolved, or the application will throw a runtime error.
   */
  readonly imports?: ReadonlyArray<ImportDefinition | DependencyKey>;

  /**
   * Dependencies pushed up to the parent domain by this module. It is required
   * that all exports from this domain _either_ be keys of entries in `provides`
   * or themselves be exports from a child domain.
   */
  readonly exports?: ReadonlyArray<ExportDefinition | DependencyKey>;

  /**
   * The components that should be registered to this domain. They should either
   * be provider definitions _or_ a class decorated with `@AutoComponent`.
   */
  readonly provides?: ReadonlyArray<IProviderDefinition | Class<any>>;
}

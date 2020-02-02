import { Class } from 'utility-types';

import { DependencyKey } from './dependency-utils';
import { DynamicProviderFn, ExportDefinition, ImportDefinition, IProviderDefinition } from './types';

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
  name: string;

  /**
   * The set of domains that are children of this one. They will be resolved to
   * `Domain`s before this definition is.
   */
  children?: Array<IDomainDefinition>;

  /**
   * Dependencies that are required by this domain. The parent domain must
   * satisfy all of these dependencies within any given lifecycle in which it is
   * resolved, or the application will throw a runtime error.
   */
  imports?: Array<ImportDefinition | DependencyKey>;

  /**
   * Dependencies pushed up to the parent domain by this module. It is required
   * that all exports from this domain _either_ be keys of entries in `provides`
   * or themselves be exports from a child domain.
   */
  exports?: Array<ExportDefinition | DependencyKey>;

  /**
   * The components that should be registered to this domain. They should either
   * be provider definitions _or_ a class decorated with `@AutoComponent`.
   */
  provides?: Array<IProviderDefinition | Class<any>>;

  /**
   * Sometimes, there's a need to build a dependency on-the-fly and to late-bind
   * it based on this or that behavior. For example: TypeORM includes the concept
   * of a 'repository' based on a data object. Having to specify these
   * repositories up front requires hacks like NestJS's "dynamic modules" and
   * their `forRoot`/`forFeature` mess.
   *
   * There is the possibility of pathological performance cases if this method is
   * slow or blocks, but since it will be run precisely once per `[key, lifecycleKey]`
   * pair, it seems unlikely to be a problem in the general case. (Using the above
   * example, it would be invoked once per data class.)
   */
  dynamicProviders?: DynamicProviderFn;
}

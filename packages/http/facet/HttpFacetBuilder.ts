import { FacetBase, IAppSpec, IFacetBehavior, IFacetBuilder, IModule } from '@stockade/core';
import { Domain, LifecycleInstance } from '@stockade/inject';
import { Logger } from '@stockade/utils/logging';

import { HttpFacet } from './HttpFacet';
import { IHttpOptions } from './IHttpOptions';

export class HttpFacetBuilder implements IFacetBuilder {
  // Somebody, looking at this class, may say "objects are a poor man's closures!".
  // That somebody is correct. However, as with the rest of Stockade, I feel like
  // the 'builder' pattern is more approachable for most people and probably makes
  // life generally just simpler. Developers shouldn't spend much time thinking
  // about how their application is structured and this is a lot easier for the
  // average developer than trying to just hand off to Stockade a big huge object.
  //
  // Alternate and improved ways to handle facets are gratefully solicited.
  constructor(readonly options: IHttpOptions) {

  }

  build(
    logger: Logger,
    parentLifecycleInstance: LifecycleInstance,
    appSpec: IAppSpec,
    domain: Domain<IModule>,
  ): FacetBase {
    return new HttpFacet(
      logger,
      parentLifecycleInstance,
      appSpec,
      domain,
      this.options,
    );
  }
}

export function httpFacet(options: IHttpOptions = {}) {
  return new HttpFacetBuilder(options);
}

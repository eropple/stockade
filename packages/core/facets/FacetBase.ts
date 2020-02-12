import { Domain, LifecycleInstance } from '@stockade/inject';
import { Logger } from '@stockade/utils/logging';

import { IAppSpec } from '../spec';
import { IFacetBehavior } from './IFacetBehavior';

export abstract class FacetBase {
  protected readonly logger: Logger;
  protected readonly lifecycleInstance: LifecycleInstance;

  protected constructor(
    logger: Logger,
    parentLifecycleInstance: LifecycleInstance,
    protected readonly appSpec: IAppSpec,
    protected readonly domain: Domain,
    protected readonly behavior: IFacetBehavior,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
    this.lifecycleInstance = new LifecycleInstance(
      this.behavior.facetRootLifecycle,
      parentLifecycleInstance,
      this.logger,
    );
  }
}

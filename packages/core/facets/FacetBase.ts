import { Domain, LifecycleInstance } from '@stockade/inject';
import { Logger } from '@stockade/utils/logging';

import { DEPENDENCY_LIFECYCLE, LOGGER } from '../inject-keys';
import { IAppSpec, IModule } from '../spec';
import { IFacetBehavior } from './IFacetBehavior';

export abstract class FacetBase {
  protected readonly logger: Logger;
  protected readonly lifecycleInstance: LifecycleInstance;

  protected constructor(
    logger: Logger,
    parentLifecycleInstance: LifecycleInstance,
    protected readonly appSpec: IAppSpec,
    protected readonly domain: Domain<IModule>,
    protected readonly behavior: IFacetBehavior,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
    this.lifecycleInstance = new LifecycleInstance(
      this.behavior.facetRootLifecycle,
      parentLifecycleInstance,
      this.logger,
    );

    this.lifecycleInstance
      .registerTemporary(DEPENDENCY_LIFECYCLE, this.lifecycleInstance)
      .registerTemporary(LOGGER, this.logger.child({ component: `${this.constructor.name}Inject` }));
  }

  abstract doStart(): Promise<any>;
  abstract doStop(): Promise<any>;

  async start(): Promise<any> {
    const ret = await this.doStart();

    return ret;
  }

  async stop(): Promise<any> {
    const ret = await this.doStop();
    this.logger.debug('Cleaning up facet lifecycle.');
    await this.lifecycleInstance.cleanup();

    return ret;
  }
}

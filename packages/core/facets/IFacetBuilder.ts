import { Class } from 'utility-types';

import { Domain, LifecycleInstance } from '@stockade/inject';
import { Logger } from '@stockade/utils/logging';

import { IAppSpec } from '../spec';
import { FacetBase } from './FacetBase';
import { IFacetBehavior } from './IFacetBehavior';

export interface IFacetBuilder {
  build(
    logger: Logger,
    parentLifecycleInstance: LifecycleInstance,
    appSpec: IAppSpec,
    domain: Domain,
  ): FacetBase;
}

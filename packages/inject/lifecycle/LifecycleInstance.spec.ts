import { FallbackLogger } from '@stockade/utils/logging';

import { LifecycleInstance } from './LifecycleInstance';
import { GLOBAL, GLOBAL_LIFECYCLE, SINGLETON, SINGLETON_LIFECYCLE } from './lifecycles';

describe('LifecycleInstance', () => {
  it('is an error to attempt to create a child instance from an unrelated lifecycle', () => {
    const global = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);

    const singleton = new LifecycleInstance(SINGLETON_LIFECYCLE, global, FallbackLogger);
    expect(() => new LifecycleInstance(GLOBAL_LIFECYCLE, singleton, FallbackLogger)).toThrow();
  });
});

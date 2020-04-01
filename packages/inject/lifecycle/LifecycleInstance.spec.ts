import { FallbackLogger } from '@stockade/utils/logging';

import { LifecycleInstance } from './LifecycleInstance';
import { GLOBAL, SINGLETON } from './lifecycles';

describe('LifecycleInstance', () => {
  it('is an error to attempt to create a child instance from an unrelated lifecycle', () => {
    const global = new LifecycleInstance(GLOBAL, null, FallbackLogger);

    const singleton = new LifecycleInstance(SINGLETON, global, FallbackLogger);
    expect(() => new LifecycleInstance(GLOBAL, singleton, FallbackLogger)).toThrow();
  });
});

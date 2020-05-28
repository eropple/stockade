import { FallbackLogger } from '@stockade/utils/logging';

import { AutoComponent } from '../annotations';
import { Domain, forKey } from '../domain';
import { IOnLifecycleCleanup } from '../IOnLifecycleCleanup';
import { GLOBAL, GLOBAL_LIFECYCLE, LifecycleInstance } from '../lifecycle';

describe('cleanup tests', () => {
  it('should clean up a component upon lifecycle cleanup', async () => {
    let hasCleanedUpObject = false;

    @AutoComponent({ lifecycle: GLOBAL })
    class CleanedUpThing implements IOnLifecycleCleanup {
      async onLifecycleCleanup(): Promise<void> {
        hasCleanedUpObject = true;
      }
    }

    const domain = Domain.fromDefinition({
      name: 'test',
      provides: [CleanedUpThing],
    });

    expect(hasCleanedUpObject).toBe(false);

    const lifecycle = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);
    const obj1 = await lifecycle.resolve(forKey(CleanedUpThing), domain);

    expect(hasCleanedUpObject).toBe(false);

    await lifecycle.cleanup();

    expect(hasCleanedUpObject).toBe(true);
  });
});

import { GLOBAL, LifecycleInstance } from '@stockade/inject';
import { FallbackLogger } from '@stockade/utils/logging';

export const GLOBAL_LIFECYCLE = new LifecycleInstance(GLOBAL, null, FallbackLogger);

import { GLOBAL, LifecycleInstance } from '@stockade/inject';
import { GLOBAL_LIFECYCLE } from '@stockade/inject/lifecycle';
import { FallbackLogger } from '@stockade/utils/logging';

export const GLOBAL_LIFECYCLE_INSTANCE = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);

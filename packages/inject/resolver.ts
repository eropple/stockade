import { DependencyKey, Domain, forKey } from './domain';
import { LifecycleInstance } from './lifecycle';

export class Resolver {
  constructor(
    private readonly lifecycle: LifecycleInstance,
    private readonly domain: Domain,
  ) {}

  async resolve<T = any>(key: DependencyKey) {
    return this.lifecycle.resolve(forKey(key), this.domain);
  }
}

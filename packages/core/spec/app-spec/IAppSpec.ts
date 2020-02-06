import { IModule } from '../module';

export interface IAppSpec extends IModule {
  readonly $isStockadeAppSpec: true;
}

export function isAppSpec(o: unknown): o is IAppSpec {
  return (o as any).$isStockadeAppSpec;
}

import { ModuleBuilderBase } from '../module';
import { IAppSpec } from './IAppSpec';

export class AppSpecBuilder extends ModuleBuilderBase<IAppSpec> {
  readonly $isStockadeAppSpecBuilder: true = true;

  constructor() {
    super({ name: 'APP', $isStockadeAppSpec: true, $isStockadeModule: true });
  }
}

export function App(): AppSpecBuilder {
  return new AppSpecBuilder();
}

export function isAppSpecBuilder(o: any): o is AppSpecBuilder {
  return (o as any).$isStockadeAppSpecBuilder;
}

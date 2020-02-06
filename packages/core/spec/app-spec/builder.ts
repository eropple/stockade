import { ModuleBuilderBase } from '../module';
import { IAppSpec } from './IAppSpec';

export class AppSpecBuilder extends ModuleBuilderBase<IAppSpec> {
  constructor() {
    super({ name: 'APP', $isStockadeAppSpec: true, $isStockadeModule: true });
  }
}

export function App(): AppSpecBuilder {
  return new AppSpecBuilder();
}

import { ModuleBuilderBase } from '../module';
import { IAppSpec } from './IAppSpec';

export class AppSpecBuilder extends ModuleBuilderBase<IAppSpec> {
  constructor() {
    super({ name: 'APP' });
  }
}

export function App() { return new AppSpecBuilder(); }

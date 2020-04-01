import { FacetSpecBuilderBase } from './FacetSpecBuilderBase';
import { IAppSpec } from './IModule';
import { ModuleSpecBuilderBase } from './ModuleBuilder';

export class AppSpecBuilder extends ModuleSpecBuilderBase<IAppSpec> {
  readonly $isStockadeAppSpecBuilder: true = true;

  constructor() {
    super({ name: 'APP', $isStockadeAppSpec: true, $isStockadeModule: true });
  }

  apply(facet: FacetSpecBuilderBase<IAppSpec>): this {
    this._mod = facet.transform(this._mod);

    return this;
  }
}

export function App(): AppSpecBuilder {
  return new AppSpecBuilder();
}

export function isAppSpecBuilder(o: any): o is AppSpecBuilder {
  return (o as any).$isStockadeAppSpecBuilder;
}

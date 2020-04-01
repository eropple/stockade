import { IModule } from './IModule';

export abstract class FacetSpecBuilderBase<TModule extends IModule> {
  abstract transform(m: TModule): TModule;
}

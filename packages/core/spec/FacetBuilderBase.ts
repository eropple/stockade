import { IModule } from './IModule';

export abstract class FacetBuilderBase<TModule extends IModule> {
  abstract transform(m: TModule): TModule;
}

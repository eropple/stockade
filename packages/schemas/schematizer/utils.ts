import { Class } from 'utility-types';

import { getModelMeta } from '../annotations';
import { SchemasError } from '../errors';

export function getModelName(cls: Class<any>) {
  const modelMeta = getModelMeta(cls);
  if (!modelMeta) {
    throw new SchemasError(`No MODEL_META for class '${cls.name}'. Add a @Model or @ModelRaw annotation.`);
  }

  return modelMeta.name ?? cls.name;
}

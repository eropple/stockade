import 'reflect-metadata';
import { Class } from 'utility-types';

import { SetMetadatas } from '@stockade/utils/metadata';

import { IModelBaseInfo, IModelMetaInfo, InferredScalarProperties, IPropMetaInfo, SchemaWithClassTypes } from '../types';
import { SchemaAnnotationKeys } from './keys';

export function getModelMeta(cls: Class<any>): IModelMetaInfo | undefined {
  return Reflect.getMetadata(SchemaAnnotationKeys.MODEL_META, cls);
}

export function getRawModelSchema(cls: Class<any>): SchemaWithClassTypes | undefined {
    return Reflect.getMetadata(SchemaAnnotationKeys.MODEL_RAW, cls);
}

export function getModelBaseInfo(cls: Class<any>): IModelBaseInfo | undefined {
  return Reflect.getMetadata(SchemaAnnotationKeys.MODEL, cls);
}

export function getRawPropSchema<T>(
  cls: Class<T>,
  propertyName: Exclude<keyof T, number | symbol>,
): SchemaWithClassTypes | undefined {
  return Reflect.getMetadata(SchemaAnnotationKeys.PROP_RAW, cls.prototype, propertyName);
}

export function getPropMeta<T>(
  cls: Class<T>,
  propertyName: Exclude<keyof T, number | symbol>,
): IPropMetaInfo | undefined {
  return Reflect.getMetadata(SchemaAnnotationKeys.PROP_META, cls.prototype, propertyName);
}

export function shouldIgnoreProp<T>(cls: Class<T>, propertyName: Exclude<keyof T, number | symbol>) {
  return propertyName !== 'constructor' &&
    Reflect.getMetadata(SchemaAnnotationKeys.PROP_IGNORE, cls.prototype, propertyName) === true;
}

export const ModelRaw =
  (rawModelSchema: SchemaWithClassTypes, modelMeta: IModelMetaInfo = {}) => SetMetadatas({
    [SchemaAnnotationKeys.MODEL_RAW]: rawModelSchema,
    [SchemaAnnotationKeys.MODEL_META]: modelMeta,
  });

export const PropRaw =
  (
    schema: SchemaWithClassTypes,
    propMeta: IPropMetaInfo = { required: true },
  ) =>
    SetMetadatas({
      [SchemaAnnotationKeys.PROP_RAW]: schema,
      [SchemaAnnotationKeys.PROP_META]: propMeta,
    });

export const Prop =
  (
    schema: Partial<InferredScalarProperties> = {},
    propMeta: IPropMetaInfo = { required: true },
  ) =>
    SetMetadatas({
      [SchemaAnnotationKeys.PROP]: schema,
      [SchemaAnnotationKeys.PROP_META]: propMeta,
    });

export const Model = (modelInfo: IModelBaseInfo = {}, modelMeta: IModelMetaInfo = {}) =>
    SetMetadatas({
      [SchemaAnnotationKeys.MODEL]: modelInfo,
      [SchemaAnnotationKeys.MODEL_META]: modelMeta,
    });

/**
 * Signals to the schema parser that this property should be ignored. This is
 * not necessary in all cases. TypeScript doesn't provide enough meta-information
 * to the JS runtime to indicate that a property with no decoration or default setter
 * actually _exists_. If you just have a
 *
 * ```
 * foo!: number;
 * ```
 *
 * hanging out in your code, then this is unnecessary as the unroller will not see that
 * property. However, if you have a property with some unrelated decorator on it, then
 * the unroller will see the property, see that it lacks a property metadata field, and
 * will scream and die. In that case, use `@PropIgnore()`.
 *
 * I stress, however, that this is here mostly for convenience and I am worried about
 * your immortal internet soul if you find yourself needing this often.
 */
export const PropIgnore = () => SetMetadatas({ [SchemaAnnotationKeys.PROP_IGNORE]: true });

import { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import { Class } from 'utility-types';

/**
 * The widest "schema" type available. This includes:
 *
 * -  a class (which should be annotated with Model/ModelRaw and Prop/PropRaw)
 * -  a JSON schema
 * -  a hybrid of the two: a JSON schema where its subtypes, such as `allOf` and
 *    `contains`, are themselves model classes.
 */
export type Schema = Class<any> | SchemaWithClassTypes | JSONSchema7;

export type SchemaWithClassTypes = JSONSchema7 & {
  allOf?: Array<JSONSchema7Definition | SchemaWithClassTypes>;
  anyOf?: Array<JSONSchema7Definition | SchemaWithClassTypes>;
  oneOf?: Array<JSONSchema7Definition | SchemaWithClassTypes>;
  not?: JSONSchema7Definition | SchemaWithClassTypes

  items?:
    | JSONSchema7Definition
    | SchemaWithClassTypes
    | Array<JSONSchema7Definition | SchemaWithClassTypes>;
  contains?: JSONSchema7 | SchemaWithClassTypes;

  additionalProperties?: JSONSchema7Definition | SchemaWithClassTypes;
};

export type ScalarPropProperties =
  | 'type'
  | 'format'
  | 'allOf'
  | 'anyOf'
  | 'oneOf'
  | 'not'
  | 'pattern'
  | 'multipleOf'
  | 'maximum'
  | 'minimum'
  | 'exclusiveMaximum'
  | 'exclusiveMinimum'
  | 'enum'
  | 'properties'
  | 'additionalProperties'
  | 'default';
export type InferredScalarProperties = Pick<SchemaWithClassTypes, ScalarPropProperties>;

export interface IModelMetaInfo {
  name?: string,
}

export interface IModelBaseInfo {
  $comment?: string,
  title?: string,
  description?: string,
}
export interface IPropMetaInfo {
  required?: boolean,
};

export type JSONReference = { $ref: string };
export function isJSONReference(obj: any): obj is JSONReference { return obj.$ref && typeof(obj.$ref) === 'string'; }

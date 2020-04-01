import { JSONSchema7 } from 'json-schema';
import * as _ from 'lodash';
import { DeepReadonly } from 'utility-types';

import { StringTo } from '@stockade/utils/types';

import { SchemasError } from '../errors';
import { InferredScalarProperties } from '../types';
import { getModelName } from './utils';

/**
 * Used to get data back _out_ of the schematizer. You load the schematizer with
 * all your schemas and then you can use `inferOrReference` here to create customized
 * and correct types for places that want them, such as Fastify query parameters or
 * OpenAPI operations.
 */
export class SchematizedDocumentInstance {
  readonly schemas: ReadonlyMap<string, DeepReadonly<JSONSchema7>>;

  constructor(
    private readonly baseTypeInfer: (type: any) => JSONSchema7 | null,
    readonly referencePath: string,
    schemas: ReadonlyMap<string, DeepReadonly<JSONSchema7>>,
  ) {
    const s: Map<string, JSONSchema7> = new Map();
    for (const [name, schema] of schemas) {
      s.set(name, this._munge(schema));
    }

    this.schemas = s;
  }

  /**
   * From a type value (either something provided via TypeScript's
   * `design:type`, `design:paramtype`, or `design:returntype` metadata, or
   * something provided explicitly by a user), attempts to create a JSON Schema
   * value that works with the output of the schematizer. If it's a constructor
   * for a recognized "static" or primitive type, this method returns a JSON
   * Schema that will be merged with `otherFields`. If it's a constructor for a
   * generic class, it will be matched with a model internal to the schematizer
   * and a JSON Reference will be returned.
   *
   * **NOTE:** `otherFields` will _only_ be merged into static types, not types
   * returned as references. This is intended to be used for things like adding
   * `minimum` or `maximum` to a `type: 'number'`. They are merged _after_ the
   * base values, so you can do things like `type: 'integer'` to constrain it
   * further than the static type.
   *
   * @param type The type to test against.
   * @param referencePath The path that references should be directed to (@see insertSchemasIntoObject)
   * @param otherFields Fields to merge into a static type.
   */
  inferOrReference(
    type: any,
    otherFields: Partial<InferredScalarProperties> = {},
  ): JSONSchema7 {
    const baseInfer = this.baseTypeInfer(type);
    if (baseInfer) {
      return { ...baseInfer, ...otherFields };
    }

    const name = getModelName(type);
    if (!this.schemas.has(name)) {
      throw new SchemasError(`inferOrReference: unrecognized type '${name}'.`)
    }

    return { $ref: `${this.referencePath}/${getModelName(type)}`}
  }

  /**
   * Given an object (such as a JSON schema document), this method causes the
   * schematizer to insert those schemas into an object at the path provided.
   *
   * `path` must be a JSON Reference path, i.e.:
   *
   * `#/definitions` `root-document.json#/components/schemas`
   *
   * @param obj the schema to update
   */
  insertSchemasIntoObject<T extends StringTo<any>>(obj: T): T {
    const pathParts = _.last(this.referencePath.split('#/'))?.split('/');
    if (!pathParts) {
      throw new SchemasError(`insertSchemasIntoObject: bad path: ${this.referencePath}`);
    }

    const schemas: StringTo<JSONSchema7> = {};
    for (const [name, schema] of this.schemas) {
      schemas[name] = schema;
    }

    const existing = _.get(obj, pathParts) ?? {};
    _.set(obj, pathParts, { ...existing, ...schemas });

    return obj;
  }

  private _munge(schema: JSONSchema7): JSONSchema7 {
    const customizer: _.CloneDeepWithCustomizer<JSONSchema7> = (
      value: any,
      key: string | number | undefined,
    ) => {
      if (key !== '$ref') { return value; }

      const refName = _.last(value.split('/'));
      if (!refName) {
        throw new SchemasError(`_mungeReferences: bad ref: ${value}`);
      }

      return `${this.referencePath}/${refName}`;
    }

    return _.cloneDeepWith(schema, customizer);
  }
}

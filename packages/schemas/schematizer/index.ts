import { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import * as _ from 'lodash';
import { Logger } from 'pino';
import { isArray } from 'util';
import { Class, DeepReadonly } from 'utility-types';

import { FallbackLogger } from '@stockade/utils/logging';
import { StringTo } from '@stockade/utils/types';

import {
  getModelBaseInfo,
  getModelMeta,
  getPropMeta,
  getRawModelSchema,
  getRawPropSchema,
  shouldIgnoreProp,
  } from '../annotations';
import { InferenceError, SchemasError } from '../errors';
import { IModelMetaInfo, InferredScalarProperties, isJSONReference, JSONReference, Schema, SchemaWithClassTypes } from '../types';
import { getModelName } from './utils';

/**
 * `Schematizer` accepts a set of target schema and attempts to walk them,
 * generating a set of JSON schemas and useful relations within them. These can
 * then be turned into valid JSON schema or stored in some other format (i.e.,
 * while JSON Schema typically will store related schemas as a reference to
 * `#/definitions/MySchema`, OpenAPI stores them as a reference to
 * `#/components/schemas/MySchema`).
 *
 * This is a bit of a stateful monster and it's a little awkward because it
 * has to support passing data out of itself. Be sure to read the method
 * documentation before you try to use it, or it _will_ bite your head off.
 */
export class Schematizer {
  static readonly IGNORABLE_TYPES: ReadonlySet<Class<any>> = new Set([
    Number, String, Date, Boolean, Promise, Array, Object,
  ]);
  private readonly logger: Logger;

  /**
   * All named sub-schemas found in the process of schematizing anything fed
   * into the schematizer. If the schematizer finds a class somewhere in the
   * hierarchy that class shall itself be schematized and stored here for
   * reconstruction later.
   */
  private readonly _schemas: Map<string, JSONSchema7> = new Map();
  get schemas(): ReadonlyMap<string, DeepReadonly<JSONSchema7>> { return this._schemas; }

  /**
   * We store all references that we find as we build our schema so we can fix
   * them up properly as we stash them into a document upon construction.
   */
  private readonly _references: Array<JSONReference> = [];

  /**
   * Contains the static and unchanging type transforms for JS built-ins such as
   * Number or Date.
   */
  private readonly _typeTransforms: Map<Class<any>, JSONSchema7> = new Map();

  /**
   * Set of classes to ignore when calling `registerClass`, because we can't
   * do anything useful with them.
   */
  private readonly _registerIgnores: Set<Class<any>> = new Set();

  constructor(
    logger: Logger = FallbackLogger,
  ) {
    this.logger = logger.child({ component: this.constructor.name });

    this._typeTransforms.set(Number, { type: 'number' });
    this._typeTransforms.set(String, { type: 'string' });
    this._typeTransforms.set(Date, { type: 'string', format: 'date' });
    this._typeTransforms.set(Boolean, { type: 'boolean' });

    this._registerIgnores.add(Promise);
    this._registerIgnores.add(Array);
    this._registerIgnores.add(Object);
  }

  /**
   * Explicitly registers a class as a sub-schema that should be returned (in
   * the `#/definitions` block of a normal JSON schema, in
   * `#/components/schemas` of an OpenAPI doc, etc.). This is probably rarely
   * needed.
   *
   * @param cls
   */
  registerClass(cls: Class<any>): void {
    if (this._typeTransforms.has(cls) || this._registerIgnores.has(cls)) {
      this.logger.debug(`registerClass: attempted to register static type or ignored class '${cls}'.`);
    } else {
      this._unrollClass(cls);
    }
  }

  isClassRegistered(type: Class<any>) {
    return this._schemas.has(getModelName(type));
  }

  makeDocumentInstance(referencePath: string): SchematizedDocumentInstance {
    return new SchematizedDocumentInstance(
      referencePath,
      this,
    );
  }

  /**
   * Creates a JSON reference based on a class. It optionally, if `trackRef` is
   * true, records the reference for use by `_mungeReferences`. `trackRef`
   * should be false for any publicly-handled references coming out of the
   * schematizer.
   */
  private _referenceFor(
    cls: Class<any>,
    trackRef: boolean = true,
    referencePath: string = '#/TEMPORARY',
  ): JSONReference {
    const name = getModelName(cls);

    const ref: JSONReference = { $ref: `${referencePath}/${name}` };

    this._references.push(ref);

    return ref;
  }

  /**
   * Handles the "is this a constructor [function]?" and the "OK, is this just a
   * JSON schema?" fork.
   */
  private _unroll(type: Schema): JSONSchema7 {
    switch(typeof(type)) {
      case 'function':
        return this.inferFromTypeOrSchematize(type);
      default:
        return this._unrollTypedSchema(type);
    }
  }

  /**
   * Given a type that shows up in either `design:type`, `design:paramtype`, or
   * an (annotated) schema, unwrap the object into a schema to be stored in the
   * schematizer.
   */
  inferFromTypeOrSchematize(
    type: any,
    otherFields: Partial<InferredScalarProperties> = {},
  ): JSONSchema7 {
    const baseInfer = this._inferBaseTypes(type);
    if (baseInfer) {
      return { ...baseInfer, ...otherFields };
    }

    return this._unrollClass(type);
  }

  private _inferBaseTypes(type: any, noThrow: boolean = false): JSONSchema7 | null {
    const staticSchema = this._typeTransforms.get(type);
    if (staticSchema) {
      return staticSchema;
    }

    switch (type) {
      case Array:
        throw new InferenceError(
          'Array received as a type in inferSchema. This usually happens ' +
          'in OpenAPI response definitions because the module is trying to ' +
          'parse a parameter or return value that is an Array; since TypeScript ' +
          'erases generic type information at runtime, you will need to ' +
          'explicitly specify schema information wherever you are receiving ' +
          'this error.',
        );
      case Promise:
        throw new InferenceError(
          'Promise received as a type in inferSchema. This usually happens ' +
          'in OpenAPI response definitions because the OpenAPI module is ' +
          'trying to make sense of an async function; since TypeScript ' +
          'erases generic type information at runtime, you will need to ' +
          'explicitly specify schema information wherever you are receiving ' +
          'this error.',
        );
      case Object:
        throw new InferenceError(
          'Object received as a type in inferSchema. TypeScript provides ' +
          'Object when it runs into union types or other types that cannot ' +
          'be cleanly expressed in terms of JavaScript constructor functions; ' +
          'you should provide explicit schema information instead of relying ' +
          'on inference.',
        );
      default:
        return null;
    }
  }

  private _unrollClass(cls: Class<any>): JSONReference {
    this.logger.debug(`Attempting to unroll: ${cls}`);

    const name = getModelName(cls);
    if (name.includes('/')) {
      throw new SchemasError(`Class '${cls}' has invalid character '/' in its schema name: ${name}`);
    }

    const logger = this.logger.child({ schemaName: name });
    if (name !== cls.name) {
      logger.debug(`Overridden class name '${cls}' for schema name: ${name}`);
    }

    if (!this._schemas.get(name)) {
      const extractedSchema = this._extractSchemaFromClass(cls);
      this._schemas.set(name, extractedSchema);
    }

    // Not all uses of `_unrollClass` will actually use this reference object,
    // so we will have some dangling references in the reference list. However,
    // they're encapsulated and each is of marginal expense when literalizing
    // the schema; I think it's fine.
    return this._referenceFor(cls);
  }

  private _extractSchemaFromClass(cls: Class<any>): JSONSchema7 {
    const modelRaw = getRawModelSchema(cls);
    const modelInfo = getModelBaseInfo(cls);
    if (modelRaw) {
      return this._unrollTypedSchema(modelRaw);
    }

    if (modelInfo) {
      // making these
      const required: Array<string> = [];
      const properties: StringTo<JSONSchema7Definition> = {};

      const clsSchema: JSONSchema7 = {
        ...modelInfo,
        type: 'object',
        required,
        properties,
      };

      for (const propertyName of Object.keys(cls.prototype)) {
        if (shouldIgnoreProp(cls, propertyName)) {
          continue;
        }

        const propRaw = getRawPropSchema(cls, propertyName);
        const propMeta = getPropMeta(cls, propertyName);
        if (!propMeta) {
          throw new SchemasError(`No PROP_META for '${propertyName}' in '${cls.name}'. Add @Prop, @PropRaw, or @PropIgnore as appropriate.`);
        }

        // TODO: implement @Prop with schema inference, etc
        if (propRaw) {
          properties[propertyName] = propRaw;
        } else {
          throw new SchemasError(`No PROP or PROP_RAW for '${propertyName}' in '${cls.name}'. Add a @Prop or @PropRaw annotation.`);
        }

        if (propMeta.required) {
          required.push(propertyName);
        }
      }

      return clsSchema;
    }

    throw new SchemasError(`Class '${cls}' lacks @Model or @ModelRaw annotation.`);
  }

  private _unrollTypedSchema(
    schema: SchemaWithClassTypes,
  ): JSONSchema7 {
    // Take the `SchemaWithClassTypes`, for every place it overrides
    // `JSONSchema7`, replace the result with `unroll(item, dependingSchemas)`
    // or `unrollDefinitions(item, dependingSchemas)` depending on the value.
    return {
      ...schema,

      allOf: this._unrollDefinitions(schema.allOf),
      anyOf: this._unrollDefinitions(schema.anyOf),
      oneOf: this._unrollDefinitions(schema.oneOf),

      not: schema.not ? this._unrollDefinition(schema.not) : undefined,

      items:
        schema.items
          ?
            isArray(schema.items)
              ? this._unrollDefinitions(schema.items)
              : this._unrollDefinition(schema.items)
          : undefined,

      contains: schema.contains ? this._unroll(schema.contains) : undefined,
      additionalProperties:
        schema.additionalProperties
          ? this._unrollDefinition(schema.additionalProperties)
          : undefined,
    };
  }

  private _unrollDefinition(
    schema: Schema | JSONSchema7Definition,
  ): JSONSchema7Definition {
    switch(typeof(schema)) {
      case 'boolean':
        return schema;
      default:
        return this._unroll(schema);
    }
  }

  private _unrollDefinitions(
    schemas: Array<JSONSchema7Definition | SchemaWithClassTypes> | undefined,
  ): Array<JSONSchema7Definition> | undefined {
    if (!schemas) { return undefined }

    return schemas.map(s => this._unrollDefinition(s));
  }
}


/**
 * Used to get data back _out_ of the schematizer. You load the schematizer with
 * all your schemas and then you can use `inferOrReference` here to create customized
 * and correct types for places that want them, such as Fastify query parameters or
 * OpenAPI operations.
 */
export class SchematizedDocumentInstance {
  constructor(
    readonly referencePath: string,
    readonly schematizer: Schematizer,
  ) {
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
    const ret = this.schematizer.inferFromTypeOrSchematize(type, otherFields);

    return isJSONReference(ret) ? this._mungeReference(ret) : ret;
  }

  insertSchemasIntoObject(rootSchema: StringTo<any>): void {
    const pathParts = (_.last(this.referencePath.split('#/')) || '').split('/');
    const inserting: StringTo<JSONSchema7> = {};
    for (const [name, schema] of this.schematizer.schemas) {
      inserting[name] = this._mungeSchema(schema);
    }

    _.set(rootSchema, pathParts, inserting);
  }

  private _mungeSchema(schema: JSONSchema7): JSONSchema7 {
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

  private _mungeReference(reference: JSONReference): JSONReference {
    const namePart = _.last(reference.$ref.split('#/'))?.split('/');

    return { $ref: `${this.referencePath}/${namePart}` };
  }
}

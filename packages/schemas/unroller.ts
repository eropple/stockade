import { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import * as _ from 'lodash';
import { Logger } from 'pino';
import { isArray } from 'util';
import { Class, DeepReadonly } from 'utility-types';

import { FallbackLogger } from '@stockade/utils/logging';
import { getAllMetadataForClass, getAllPropertyMetadataForClass } from '@stockade/utils/metadata';
import { StringTo } from '@stockade/utils/types';

import {
  getModelBaseInfo,
  getModelMeta,
  getPropMeta,
  getRawModelSchema,
  getRawPropSchema,
  shouldIgnoreProp,
  } from './annotations';
import { InferenceError, SchemasError } from './errors';
import { IModelMetaInfo, InferredScalarProperties, JSONReference, Schema, SchemaWithClassTypes } from './types';

function getModelName(cls: Class<any>) {
  const modelMeta = getModelMeta(cls);
  if (!modelMeta) {
    throw new SchemasError(`No MODEL_META for class '${cls.name}'. Add a @Model or @ModelRaw annotation.`);
  }

  return modelMeta.name ?? cls.name;
}

/**
 * `Schematizer` accepts a set of target schema and attempts to walk them, generating a
 * set of JSON schemas and useful relations within them. These can then be turned into
 * valid JSON schema or stored in some other format (i.e., while JSON Schema typically
 * will store related schemas as a reference to `#/definitions/MySchema`, OpenAPI stores
 * them as a reference to `#/components/schemas/MySchema`).
 *
 * This is a bit of a stateful monster. Be sure to read the method documentation before
 * you try to use it, or it _will_ bite your head off.
 */
export class Schematizer {
  private readonly logger: Logger;

  /**
   * All named sub-schemas found in the process of schematizing anything fed into the schematizer.
   * If the schematizer finds a class somewhere in the hierarchy that class shall itself be
   * schematized and stored here for reconstruction later.
   */
  private readonly _schemas: Map<string, JSONSchema7> = new Map();
  get schemas(): ReadonlyMap<string, DeepReadonly<JSONSchema7>> { return this._schemas; }

  /**
   * We store all references that we find as we build our schema so we can fix them up
   * properly as we stash them into a document upon construction.
   */
  private readonly _references: Array<JSONReference> = [];

  /**
   * Contains the static and unchanging type transforms for JS built-ins such as Number
   * or Date.
   */
  private readonly _typeTransforms: Map<Class<any>, JSONSchema7> = new Map();

  constructor(
    logger: Logger = FallbackLogger,
  ) {
    this.logger = logger.child({ component: this.constructor.name });

    this._typeTransforms.set(Number, { type: 'number' });
    this._typeTransforms.set(String, { type: 'string' });
    this._typeTransforms.set(Date, { type: 'string', format: 'date' });
    this._typeTransforms.set(Boolean, { type: 'boolean' });
  }

  /**
   * Explicitly registers a class as a sub-schema that should be returned (in the `#/definitions`
   * block of a normal JSON schema, in `#/components/schemas` of an OpenAPI doc, etc.). This is
   * probably rarely needed.
   *
   * @param cls
   */
  registerClass(cls: Class<any>): void {
    this._unrollClass(cls);
  }

  /**
   * Given an object (such as a JSON schema document), this method causes the schematizer to
   * update all internal references within all provided schemas, create a deep clone of all
   * schemas (to isolate those references), and insert those schemas into an object at the
   * path provided.
   *
   * `path` must be a JSON Reference path, i.e.:
   *
   * `#/definitions`
   * `root-document.json#/components/schemas`
   *
   * **THIS CREATES STATEFUL CHANGES TO THE SCHEMATIZER.** They should be constrained to within
   * the current iteration as this is not an async method, but if you're introspecting the guts
   * of this, demons may fly out your nose.
   *
   * @param obj the schema to update
   * @param path a JSON Reference path
   */
  insertSchemasIntoObject<T extends StringTo<any>>(obj: T, path: string): T {
    const pathParts = _.last(path.split('#/'))?.split('/');
    if (!pathParts) {
      throw new SchemasError(`insertSchemasIntoObject: bad path: ${path}`);
    }

    this._mungeReferences(path);

    const schemas: StringTo<JSONSchema7> = {};
    for (const [name, schema] of this._schemas) {
      schemas[name] = schema;
    }

    _.set(obj, pathParts, _.cloneDeep(schemas));

    return obj;
  }

  private _mungeReferences(path: string) {
    for (const ref of this._references) {
      const name = _.last(ref.$ref.split('/'));
      if (!name) {
        throw new SchemasError(`_mungeReferences: bad ref: ${ref} for new path ${path}`);
      }

      ref.$ref = `${path}/${name}`;
    }
  }

  /**
   * Helps us keep track of the references we create so we can do our
   * stateful fixup before splatting them out.
   */
  private _referenceFor(cls: Class<any>): JSONReference {
    const name = getModelName(cls);

    const ref: JSONReference = { $ref: `#/TEMPORARY/${name}` };
    this._references.push(ref);

    return ref;
  }

  /**
   * Handles the "is this a constructor [function]?" and the
   * "OK, is this just a JSON schema?" fork.
   */
  private _unroll(type: Schema): JSONSchema7 {
    switch(typeof(type)) {
      case 'function':
        return this._inferFromType(type);
      default:
        return this._unrollTypedSchema(type);
    }
  }

  /**
   *
   */
  private _inferFromType(type: any): JSONSchema7 {
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
        return this._unrollClass(type);
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

    // Not all uses of `_unrollClass` will actually use this reference object, so
    // we will have some dangling references in the reference list. However, they're
    // encapsulated and each is of marginal expense when literalizing the schema; I
    // think it's fine.
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
    // Take the `SchemaWithClassTypes`, for every place it overrides `JSONSchema7`,
    // replace the result with `unroll(item, dependingSchemas)` or
    // `unrollDefinitions(item, dependingSchemas)` depending on the value.
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

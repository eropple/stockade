import { JSONSchema7 } from 'json-schema';
import 'source-map-support';

import { Model, ModelRaw, Prop, PropRaw } from './annotations';
import { Schematizer } from './schematizer';

describe('behavior tests', () => {
  describe('ModelRaw', () => {
    it('should accept ModelRaw as the complete definition for an object', () => {
      const jsonSchema: JSONSchema7 = {
        type: 'object',
        required: ['bar'],
        properties: {
          bar: { type: 'number' },
        },
      };

      @ModelRaw(jsonSchema)
      class ModelRawTest {
        bar!: number;
      }

      const rootSchema: JSONSchema7 = {};
      const schematizer = new Schematizer();
      schematizer.registerClass(ModelRawTest);
      const document = schematizer.makeDocumentInstance('#/definitions');
      document.insertSchemasIntoObject(rootSchema);

      const outSchema = rootSchema.definitions!.ModelRawTest;

      expect(outSchema).toMatchObject(jsonSchema);
    });

    it('should ignore @Prop/@PropRaw within a ModelRaw', () => {
      const jsonSchema: JSONSchema7 = {
        type: 'object',
        required: ['bar'],
        properties: {
          bar: { type: 'number' },
        },
      };

      @ModelRaw(jsonSchema)
      class ModelRawIgnorePropRawTest {
        bar!: number;

        @PropRaw({ type: 'string' })
        foo!: string;
      }

      const rootSchema: JSONSchema7 = {};
      const schematizer = new Schematizer();
      schematizer.registerClass(ModelRawIgnorePropRawTest);
      const document = schematizer.makeDocumentInstance('#/definitions');
      document.insertSchemasIntoObject(rootSchema);
      const outSchema = rootSchema.definitions!.ModelRawIgnorePropRawTest;

      expect(outSchema).toMatchObject(jsonSchema);
    });
  });

  describe('Model', () => {
    it('should honor @Prop', () => {
      @Model({ title: 'ModelWithPropRaw' })
      class ModelWithPropRaw {
        @Prop()
        foo!: number;
      }

      expect(false).toBe(true);
    });

    it('should honor PropRaw', () => {
      const propFooSchema: JSONSchema7 = { type: 'number' };
      const propBarSchema: JSONSchema7 = { type: 'string' };

      @Model({ title: 'ModelWithPropRaw' })
      class ModelWithPropRaw {
        @PropRaw(propFooSchema)
        foo!: number;

        @PropRaw(propBarSchema, { required: false })
        bar!: string;
      }

      const rootSchema: JSONSchema7 = {};
      const schematizer = new Schematizer();
      schematizer.registerClass(ModelWithPropRaw);
      const document = schematizer.makeDocumentInstance('#/definitions');
      document.insertSchemasIntoObject(rootSchema);
      const outSchema = rootSchema.definitions!.ModelWithPropRaw as JSONSchema7;

      expect(outSchema.properties!.foo).toMatchObject(propFooSchema);
      expect(outSchema.properties!.bar).toMatchObject(propBarSchema);
      expect(outSchema.required).not.toContain('bar');
      expect(outSchema.required).toContain('foo');
    });

    it('should silently ignore un-annotated props (we have no other choice)', () => {
      const propFooSchema: JSONSchema7 = { type: 'number' };

      @Model({ title: 'ModelWithPropIgnore' })
      class ModelWithPropIgnore {
        @PropRaw(propFooSchema)
        foo!: number;

        bar!: string;
      }

      const rootSchema: JSONSchema7 = {};
      const schematizer = new Schematizer();
      schematizer.registerClass(ModelWithPropIgnore);
      const document = schematizer.makeDocumentInstance('#/definitions');
      document.insertSchemasIntoObject(rootSchema);
      const outSchema = rootSchema.definitions!.ModelWithPropIgnore as JSONSchema7;

      expect(outSchema.properties!.foo).toMatchObject(propFooSchema);
      expect(outSchema.properties!.bar).toBeUndefined();
    });
  });

  it('should respect a custom name for the model', () => {
      @Model({}, { name: 'ModelActualName' })
      class ModelWithOverriddenName {
      }

      const rootSchema: JSONSchema7 = {};
      const schematizer = new Schematizer();
      schematizer.registerClass(ModelWithOverriddenName);
      const document = schematizer.makeDocumentInstance('#/definitions');
      document.insertSchemasIntoObject(rootSchema);
      const outSchema = rootSchema.definitions!.ModelActualName as JSONSchema7;

      expect(outSchema).not.toBeUndefined();
  });
});

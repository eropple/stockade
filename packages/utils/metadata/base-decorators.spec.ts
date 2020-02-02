// tslint:disable: no-magic-numbers
import {
  AppendArrayMetadata,
  ExtendObjectMetadata,
  getAllMetadataForClass,
  getAllPropertyMetadataForClass,
  SetMetadata,
} from './base-decorators';

describe('metadata', () => {
  describe('helpers', () => {
    describe('setMetadata', () => {
      it('should work on classes', () => {
        // note: decorators are evaluated last-first
        @SetMetadata<string>('TEST_ITEM', 'qwop')
        class ClassSingleItem {}

        expect(getAllMetadataForClass(ClassSingleItem).TEST_ITEM).toBe('qwop');
      });

      it('should work on methods', () => {
        class MethodSingleItem {
          @SetMetadata<string>('TEST_ITEM', 'qwop')
          // tslint:disable-next-line: prefer-function-over-method
          singleItem() {}
        }

        expect(getAllPropertyMetadataForClass(MethodSingleItem, 'singleItem').TEST_ITEM).toBe('qwop');
      });
    });

    describe('appendArrayMetadata', () => {
      it('should work on classes', () => {
        // note: decorators are evaluated last-first
        @AppendArrayMetadata<number>('TEST_ARRAY', [4, 5])
        @AppendArrayMetadata<number>('TEST_ARRAY', 6)
        @AppendArrayMetadata<number>('TEST_ARRAY', 7)
        @AppendArrayMetadata<number>('TEST_ARRAY', 7)
        class ClassArray {}

        expect(getAllMetadataForClass(ClassArray).TEST_ARRAY)
          .toStrictEqual([7, 7, 6, 4, 5]);
      });

      it('should work on methods', () => {
        class MethodArray {
          @AppendArrayMetadata<number>('TEST_ARRAY', [4, 5])
          @AppendArrayMetadata<number>('TEST_ARRAY', 6)
          @AppendArrayMetadata<number>('TEST_ARRAY', 7)
          @AppendArrayMetadata<number>('TEST_ARRAY', 7)
          // tslint:disable-next-line: prefer-function-over-method
          arrayMethod() {}
        }

        expect(getAllPropertyMetadataForClass(MethodArray, 'arrayMethod').TEST_ARRAY)
          .toStrictEqual([7, 7, 6, 4, 5]);
      });
    });

    describe('mergeObjectMetadata', () => {
      it('should work on classes', () => {
        interface ITest {
          foo?: number;
          bar?: string;
          baz: number;
        }

        // note: decorators are evaluated last-first
        @ExtendObjectMetadata<ITest>('TEST_OBJECT', {}, { baz: 22 })
        @ExtendObjectMetadata<ITest>('TEST_OBJECT', { foo: 32 }, { baz: 22 })
        @ExtendObjectMetadata<ITest>('TEST_OBJECT', { bar: 'hi' }, { baz: 22 })
        class ClassObject {}

        expect(getAllMetadataForClass(ClassObject).TEST_OBJECT)
          .toStrictEqual({ foo: 32, bar: 'hi', baz: 22 });
      });

      it('should work on methods', () => {
        interface ITest {
          foo?: number;
          bar?: string;
          baz: number;
        }

        class MethodObject {
          @ExtendObjectMetadata<ITest>('TEST_OBJECT', {}, { baz: 22 })
          @ExtendObjectMetadata<ITest>('TEST_OBJECT', { foo: 32 }, { baz: 22 })
          @ExtendObjectMetadata<ITest>('TEST_OBJECT', { bar: 'hi' }, { baz: 22 })
          // tslint:disable-next-line: prefer-function-over-method
          objectMethod() {}
        }

        expect(getAllPropertyMetadataForClass(MethodObject, 'objectMethod').TEST_OBJECT)
          .toStrictEqual({ foo: 32, bar: 'hi', baz: 22 });
      });
    });
  });
});

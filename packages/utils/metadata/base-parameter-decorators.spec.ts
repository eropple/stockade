// tslint:disable: no-magic-numbers
import { getAllMetadataForClass, getAllPropertyMetadataForClass, NoMetadata, SetMetadata } from './base-decorators';
import {
  getConstructorParameterMetadataForClass,
  getPropertyParameterMetadataForClass,
  PARAMETER_DESIGN_TYPE,
  SetMetadataForParameter,
} from './base-parameter-decorators';

describe('metadata', () => {
  describe('helpers', () => {
    describe('setMetadata', () => {
      it('should work on constructors', () => {
        class ConstructorTest {
          constructor(
            w: string,
            @SetMetadataForParameter<string>('TEST_ITEM', 'abc') x: string,
            @SetMetadataForParameter<string>('TEST_ITEM', 'def') y: number,
            z: {},
          ) {}
        }

        const allParamMetadata = getConstructorParameterMetadataForClass(ConstructorTest);

        expect(allParamMetadata.get(0)).toStrictEqual({ [PARAMETER_DESIGN_TYPE]: String });
        expect(allParamMetadata.get(1)).toStrictEqual({ [PARAMETER_DESIGN_TYPE]: String, TEST_ITEM: 'abc' });
        expect(allParamMetadata.get(2)).toStrictEqual({ [PARAMETER_DESIGN_TYPE]: Number, TEST_ITEM: 'def' });
        expect(allParamMetadata.get(3)).toStrictEqual({ [PARAMETER_DESIGN_TYPE]: Object });
      });

      it('should work on _undecorated_ constructors', () => {
        // TODO: ensure this is documented somewhere noticeable
        // For some godawful reason, TypeScript _only_ emits `design:paramtypes` when there's
        // a decorator attached to a thing. Sigh.
        @NoMetadata()
        class BlankConstructorTest {
          constructor(a: number, b: string) {}
        }

        const allParamMetadata = getConstructorParameterMetadataForClass(BlankConstructorTest);

        expect(allParamMetadata.get(0)).toStrictEqual({ [PARAMETER_DESIGN_TYPE]: Number });
        expect(allParamMetadata.get(1)).toStrictEqual({ [PARAMETER_DESIGN_TYPE]: String });
      });

      it('should work on method parameters', () => {
        class SingleItemInParameter {
          // tslint:disable-next-line: prefer-function-over-method
          singleItemInParameter(
            w: string,
            @SetMetadataForParameter<string>('TEST_ITEM', 'abc') x: string,
            @SetMetadataForParameter<string>('TEST_ITEM', 'def') y: number,
            z: {},
          ) {}
        }

        const allParamMetadata = getPropertyParameterMetadataForClass(SingleItemInParameter, 'singleItemInParameter');

        expect(allParamMetadata.get(0)).toStrictEqual({ [PARAMETER_DESIGN_TYPE]: String });
        expect(allParamMetadata.get(1)).toStrictEqual({ [PARAMETER_DESIGN_TYPE]: String, TEST_ITEM: 'abc' });
        expect(allParamMetadata.get(2)).toStrictEqual({ [PARAMETER_DESIGN_TYPE]: Number, TEST_ITEM: 'def' });
        expect(allParamMetadata.get(3)).toStrictEqual({ [PARAMETER_DESIGN_TYPE]: Object });
      });
    });

    //  TODO: add equivalent tests for arrays and objects
    //  It's pretty safe to assume that they're fine, but just to be sure, etc.
  });
});

import { Model } from '@stockade/schemas';

import { isMethodReturnByCode, MethodReturnByCode } from './controller-info';

@Model()
class Foo {

}

describe('controller-info', () => {
  describe('MethodReturnByCode', () => {
    it('should handle the happy paths', () => {
      expect(isMethodReturnByCode({})).toBe(false);

      expect(isMethodReturnByCode(Foo)).toBe(false);

      expect(isMethodReturnByCode({
        default: Foo,
      })).toBe(true);

      expect(isMethodReturnByCode({
        default: Foo,
        66: Foo,
      })).toBe(false);

      expect(isMethodReturnByCode({
        default: Foo,
        qx: Foo,
      })).toBe(false);

      expect(isMethodReturnByCode({
        default: Foo,
        200: Foo,
      })).toBe(true);
    });
  });
})

import { AutoComponent } from '../annotations/auto-component.decorator';
import { DependencyKey, forKey } from './dependency-utils';

describe('dependency-utils', () => {
    describe('forKey', () => {
      it('returns a symbol for a string', () => {
        const keyA: DependencyKey = 'FooBar';
        const keyB: DependencyKey = 'FooBar';

        expect(typeof forKey(keyA)).toBe('symbol');
        expect(forKey(keyA)).toEqual(forKey(keyB));
        expect(forKey(keyA).description).toBe('FooBar');
      });

      it('returns a globally identified symbol for a symbol', () => {
        const keyA: DependencyKey = Symbol('FooBar');
        const keyB: DependencyKey = Symbol('FooBar');

        expect(keyA).not.toBe(keyB);

        expect(typeof forKey(keyA)).toBe('symbol');
        expect(forKey(keyA)).toEqual(forKey(keyB));
        expect(forKey(keyA).description).toBe('FooBar');
      });

      it ('returns a symbol for a class', () => {
        @AutoComponent()
        class FooBar {}

        expect(typeof forKey(FooBar)).toBe('symbol');
        expect(forKey(FooBar).description).toBe('FooBar');
      });

      it ('returns a specific symbol for a class that has the @AutoComponent decorator', () => {
        @AutoComponent({ key: 'FooBar' })
        class BarBaz {}

        expect(typeof forKey(BarBaz)).toBe('symbol');
        expect(forKey(BarBaz).description).toBe('FooBar');
      });
    });
});

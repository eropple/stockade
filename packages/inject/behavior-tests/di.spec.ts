// tslint:disable: no-magic-numbers
// tslint:disable: max-line-length

import { FallbackLogger } from '@stockade/utils/logging';

import { AutoComponent, Inject } from '../annotations';
import { bind, Domain } from '../domain';
import { forKey } from '../domain/dependency-utils';
import { GLOBAL, LifecycleInstance, SINGLETON } from '../lifecycle';
import {
  CircularDependencyError,
  DependencyNotSatisfiedError,
} from '../lifecycle/errors';

// The most important tests for `@stockade/inject` are going to cross
// multiple module boundaries. Those integrated tests go here.

describe('integrated DI tests', () => {
  describe('tests in a single lifecycle', () => {
    it('should resolve a value provider in the local domain', async () => {
      const domain = Domain.fromDefinition({
        name: 'test',
        provides: [
          bind('MyTestKey').in(GLOBAL).toValue(5),
        ],
      });

      const lifecycle = new LifecycleInstance(GLOBAL, null, FallbackLogger);

      const ret = await lifecycle.resolve(forKey('MyTestKey'), domain);
      expect(ret).toBe(5);
    });

    it('should import a provider from the parent', async () => {
      const domain = Domain.fromDefinition({
        name: 'parent',
        provides: [
          bind('MyParentKey').in(GLOBAL).toValue(5),
        ],
        children: [
          {
            name: 'child',
            imports: ['MyParentKey'],
          },
        ],
      });
      const childDomain = domain.children[0];

      const lifecycle = new LifecycleInstance(GLOBAL, null, FallbackLogger);

      const retA = await lifecycle.resolve(forKey('MyParentKey'), domain);
      expect(retA).toBe(5);
      const retB = await lifecycle.resolve(forKey('MyParentKey'), childDomain);
      expect(retB).toBe(5);
    });

    it('should resolve a provider from a child', async () => {
      const domain = Domain.fromDefinition({
        name: 'parent',
        children: [
          {
            name: 'child',
            exports: ['MyChildKey'],
            provides: [
              bind('MyChildKey').in(GLOBAL).toValue(5),
            ],
          },
        ],
      });

      const lifecycle = new LifecycleInstance(GLOBAL, null, FallbackLogger);

      const ret = await lifecycle.resolve(forKey('MyChildKey'), domain);
      expect(ret).toBe(5);
    });

    it('should resolve a class provider', async () => {
      @AutoComponent({ lifecycle: GLOBAL })
      class Dep {}

      @AutoComponent({ lifecycle: GLOBAL })
      class Injected {
        constructor(
          @Inject('a') readonly a: number,
          readonly dep: Dep,
        ) {}
      }

      const domain = Domain.fromDefinition({
        name: 'test',
        provides: [
          bind('a').in(GLOBAL).toValue(5),
          Dep,
          Injected,
        ],
      });

      const lifecycle = new LifecycleInstance(GLOBAL, null, FallbackLogger);
      const obj = await lifecycle.resolve(forKey(Injected), domain);

      expect(obj.constructor).toBe(Injected);
      expect(obj.a).toBe(5);
      expect(obj.dep.constructor).toBe(Dep);
    });

    it('should `instantiate` a class based on a domain', async () => {
      @AutoComponent({ lifecycle: GLOBAL })
      class Dep {}

      const domain = Domain.fromDefinition({
        name: 'test',
        provides: [
          bind('a').in(GLOBAL).toValue(5),
          Dep,
        ],
      });

      class Instantiated {
        constructor(
          @Inject('a') readonly a: number,
          readonly dep: Dep,
        ) {}
      }

      const lifecycle = new LifecycleInstance(GLOBAL, null, FallbackLogger);
      const obj = await lifecycle.instantiate(Instantiated, domain);

      expect(obj.constructor).toBe(Instantiated);
      expect(obj.a).toBe(5);
      expect(obj.dep.constructor).toBe(Dep);
    });

    it('should cache within a lifecycle', async () => {
      let x = 1;

      @AutoComponent({ lifecycle: GLOBAL })
      class A {
        readonly num: number;

        constructor() {
          this.num = x;
          x += 1;
        }
      }

      const domain = Domain.fromDefinition({
        name: 'test',
        provides: [A],
      });

      const lifecycle = new LifecycleInstance(GLOBAL, null, FallbackLogger);
      const obj1 = await lifecycle.resolve(forKey(A), domain);
      const obj2 = await lifecycle.resolve(forKey(A), domain);

      expect(obj1).toBe(obj2);
      expect(obj1.num).toBe(obj2.num);
    });

    it('should handle multiply referenced dependencies', async () => {
      //
      // This test proves the need for locking, as without the locking being done in
      // the `LifecycleInstance` you'll very easily end up with this:
      //
      // D {
      //  a: A { num: 1 },
      //  b: B { a: A { num: 2 } },
      //  c: C { a: A { num: 3 } }
      // }
      //
      // Given that objects in a lifecycle, once created, should be re-used for every
      // subsequent resolution, this is obviously Hella Bad.
      let x = 1;

      @AutoComponent({ lifecycle: GLOBAL })
      class A {
        readonly num: number;

        constructor() {
          this.num = x;
          x += 1;
        }
      }

      @AutoComponent({ lifecycle: GLOBAL })
      class B {
        constructor(readonly a: A) {}
      }

      @AutoComponent({ lifecycle: GLOBAL })
      class C {
        constructor(readonly a: A) {}
      }

      @AutoComponent({ lifecycle: GLOBAL })
      class D {
        constructor(readonly a: A, readonly b: B, readonly c: C) {}
      }

      const domain = Domain.fromDefinition({
        name: 'test',
        provides: [A, B, C, D],
      });

      const lifecycle = new LifecycleInstance(GLOBAL, null, FallbackLogger);
      const obj = await lifecycle.resolve(forKey(D), domain);

      expect(obj.constructor).toBe(D);
      expect(obj.a.constructor).toBe(A);
      expect(obj.b.constructor).toBe(B);
      expect(obj.c.constructor).toBe(C);
      expect(obj.b.a).toBe(obj.a);
      expect(obj.c.a).toBe(obj.a);
    });

    // You will not, repeat not, convince me that circular dependencies in a
    // dependency injector are a good idea.
    it('should error on circular dependencies', async () => {
      const domain = Domain.fromDefinition({
        name: 'test',
        provides: [
          bind('a').in(GLOBAL).toFactory({ inject: ['b'], fn: () => 5 }),
          bind('b').in(GLOBAL).toFactory({ inject: ['a'], fn: () => 10 }),
        ],
      });

      const lifecycle = new LifecycleInstance(GLOBAL, null, FallbackLogger);

      try {
        await lifecycle.resolve(forKey('a'), domain);
        expect('this should have failed').toBeFalsy();
      } catch (err) {
        expect(err.constructor).toBe(CircularDependencyError);
      }
    });

    it('should error when resolving a non-exported component from a parent', async () => {
      @AutoComponent({ lifecycle: GLOBAL })
      class A {}

      const domain = Domain.fromDefinition({
        name: 'test',
        provides: [A],
      });

      const lifecycle = new LifecycleInstance(GLOBAL, null, FallbackLogger);
      try {
        await lifecycle.resolve(forKey('b'), domain);
        expect('this should have failed').toBeFalsy();
      } catch (err) {
        expect(err.constructor).toBe(DependencyNotSatisfiedError);
      }
    });

    describe('dynamic providers', () => {
      it ('should cache the object that has been created for the entire lifecycle', async () => {
        let x = 1;
        const domain = Domain.fromDefinition({
          name: 'parent',
          dynamicProviders: (d, key, lcInstance, exp) => {
            // tslint:disable-next-line: increment-decrement
            return lcInstance.lifecycle === SINGLETON ? bind('MyKey').in(SINGLETON).toValue(x++) : null;
          },
        });

        const global = new LifecycleInstance(GLOBAL, null, FallbackLogger);
        const singleton = new LifecycleInstance(SINGLETON, global, FallbackLogger);
        const singleton2 = new LifecycleInstance(SINGLETON, global, FallbackLogger);

        const a = await singleton.resolve(Symbol.for('MyKey'), domain);
        const a2 = await singleton.resolve(Symbol.for('MyKey'), domain);
        const b = await singleton2.resolve(Symbol.for('MyKey'), domain);

        expect(a).toBe(a2);
        expect(a).not.toBe(b);
      });

      it ('should error when attempting to get a dynamic provider from a child without exporting', async () => {
        const domain = Domain.fromDefinition({
          name: 'parent',
          provides: [],
          children: [
            {
              name: 'child',
              dynamicProviders: (d, key, lcInstance, exp) => {
                if (!exp && key === Symbol.for('ChildLocalKey') && lcInstance.lifecycle === GLOBAL) {
                  return bind('ChildLocalKey').in(lcInstance.lifecycle).toValue(300);
                }

                if (key === Symbol.for('ChildExportKey') && lcInstance.lifecycle === GLOBAL) {
                  return bind('ChildExportKey').in(lcInstance.lifecycle).toValue(1337);
                }

                return null;
              },
            },
          ],
        });

        const global = new LifecycleInstance(GLOBAL, null, FallbackLogger);
        // child should resolve the local key...
        expect(await global.resolve(forKey('ChildLocalKey'), domain.children[0])).toBe(300);
        // ...and the export key...
        expect(await global.resolve(forKey('ChildExportKey'), domain.children[0])).toBe(1337);

        // parent should resolve the export key...
        expect(await global.resolve(forKey('ChildExportKey'), domain)).toBe(1337);
        // parent should not resolve the local key.
        try {
          await global.resolve(forKey('ChildLocalKey'), domain);
          expect('this should have failed').toBeFalsy();
        } catch (err) {}
      });
    });

    it ('can override a dependency from the parent lifecycle when done explicitly', async () => {
      const domain = Domain.fromDefinition({
        name: 'parent',
        provides: [
          bind('MyOverriddenThing').in(GLOBAL).toValue(1),
        ],
        children: [
          {
            name: 'child',
            dynamicProviders: async (d, key, lcInstance, exp) => {
              if (key === Symbol.for('MyOverriddenThing') && lcInstance.lifecycle === SINGLETON) {
                const globalValue = await lcInstance.parent?.resolve(key, d);

                return bind(key).in(SINGLETON).toValue(globalValue + 1000);
              }

              return null;
            },
          },
        ],
      });

      const global = new LifecycleInstance(GLOBAL, null, FallbackLogger);
      const singleton = new LifecycleInstance(SINGLETON, global, FallbackLogger);

      const retA = await global.resolve(forKey('MyOverriddenThing'), domain);
      expect(retA).toBe(1);

      const retB = await singleton.resolve(forKey('MyOverriddenThing'), domain);
      expect(retB).toBe(1001);
    });
  });

  describe('tests across lifecycles', () => {
    it('should check parents to satisfy dependencies', async () => {
      const global = new LifecycleInstance(GLOBAL, null, FallbackLogger);
      const singleton = new LifecycleInstance(SINGLETON, global, FallbackLogger);

      let x = 1;

      @AutoComponent({ lifecycle: GLOBAL })
      class A {
        readonly num: number;

        constructor() {
          this.num = x;
          x += 1;
        }
      }

      const domain = Domain.fromDefinition({
        name: 'test',
        provides: [A],
      });

      const retA = await global.resolve(forKey(A), domain);
      const retB = await singleton.resolve(forKey(A), domain);
      expect(retA).toBe(retB);
      expect(retA.num).toBe(retB.num);
    });

    it('should preferentially use a provider in the lowermost lifecycle', async () => {
      const global = new LifecycleInstance(GLOBAL, null, FallbackLogger);
      const singleton = new LifecycleInstance(SINGLETON, global, FallbackLogger);

      const domain = Domain.fromDefinition({
        name: 'test',
        provides: [
          bind('a').in(GLOBAL).toValue(5),
          bind('a').in(SINGLETON).toValue(10),
        ],
      });

      const retA = await global.resolve(forKey('a'), domain);
      expect(retA).toBe(5);
      const retB = await singleton.resolve(forKey('a'), domain);
      expect(retB).toBe(10);
    });

    it('should resolve a dependency across lifecycles AND across scopes', async () => {
      const global = new LifecycleInstance(GLOBAL, null, FallbackLogger);
      const singleton = new LifecycleInstance(SINGLETON, global, FallbackLogger);

      let x = 1;
      let y = 10;

      @AutoComponent({ lifecycle: GLOBAL })
      class A {
        readonly numA: number;

        constructor() {
          this.numA = x;
          x += 1;
        }
      }

      @AutoComponent()
      class B {
        readonly numB: number;

        constructor(readonly a: A) {
          this.numB = y;
          y += 1;
        }
      }

      const domain = Domain.fromDefinition({
        name: 'parent',
        provides: [A],
        children: [
          {
            name: 'child',
            imports: [A],
            provides: [B],
            exports: [B],
          },
        ],
      });

      // making sure that the global scope resolves as expected
      const retA = await global.resolve(forKey(A), domain);
      expect(retA.constructor).toBe(A);

      // child pulling global-lifecycle object from parent
      const retB = await singleton.resolve(forKey(B), domain.children[0]);
      expect(retB.constructor).toBe(B);
      expect(retB.a).toBe(retA);

      // and just for giggles, making sure the parent does the right thing with an exported child
      const retC = await singleton.resolve(forKey(B), domain);
      expect(retC).toBe(retB);
    });
  });
});

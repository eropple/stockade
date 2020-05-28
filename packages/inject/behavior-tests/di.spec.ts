// tslint:disable: no-magic-numbers
// tslint:disable: max-line-length

import { FallbackLogger } from '@stockade/utils/logging';

import { AutoComponent, Inject } from '../annotations';
import { bind, Domain } from '../domain';
import { forKey } from '../domain/dependency-utils';
import { FACET, GLOBAL, GLOBAL_LIFECYCLE, ILifecycle, LifecycleInstance, SINGLETON, SINGLETON_LIFECYCLE, SUB_FACET } from '../lifecycle';
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

      const lifecycle = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);

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

      const lifecycle = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);

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

      const lifecycle = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);

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

      const lifecycle = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);
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

      const lifecycle = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);
      const obj = await lifecycle.instantiate(Instantiated, domain);

      expect(obj.constructor).toBe(Instantiated);
      expect(obj.a).toBe(5);
      expect(obj.dep.constructor).toBe(Dep);
    });

    it('should re-use an instantiated class within a lifecycle when not transient', async () => {
      let a = 1;

      const domain = Domain.fromDefinition({
        name: 'test',
        provides: [
        ],
      });

      class Instantiated {
        readonly a: number;

        constructor(
        ) {
          this.a = a;
          a += 1;
        }
      }

      const lifecycle = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);
      const obj = await lifecycle.instantiate(Instantiated, domain);
      const obj2 = await lifecycle.instantiate(Instantiated, domain);

      expect(obj.constructor).toBe(Instantiated);
      expect(obj).toBe(obj2);
      expect(obj.a).toBe(obj2.a);
    });

    it('should not re-use an instantiated class within a lifecycle when transient', async () => {
      let a = 1;

      const domain = Domain.fromDefinition({
        name: 'test',
        provides: [
        ],
      });

      class Instantiated {
        readonly a: number;

        constructor(
        ) {
          this.a = a;
          a += 1;
        }
      }

      const lifecycle = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);
      const obj = await lifecycle.instantiate(Instantiated, domain, false);
      const obj2 = await lifecycle.instantiate(Instantiated, domain, false);

      expect(obj.constructor).toBe(Instantiated);
      expect(obj).not.toBe(obj2);
      expect(obj.a).not.toBe(obj2.a);
    });

    it('should prefer the use of a registered temporary over a dependency when resolving', async () => {
      const domain = Domain.fromDefinition({
        name: 'test',
        provides: [
          bind('a').in(GLOBAL).toValue(5),
        ],
      });

      class Instantiated {
        constructor(
          @Inject('a') readonly a: number,
        ) {}
      }

      const lifecycle = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);
      lifecycle.registerTemporary('a', 10);
      const obj = await lifecycle.instantiate(Instantiated, domain);

      expect(obj.constructor).toBe(Instantiated);
      expect(obj.a).toBe(10);
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

      const lifecycle = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);
      const obj1 = await lifecycle.resolve(forKey(A), domain);
      const obj2 = await lifecycle.resolve(forKey(A), domain);

      expect(obj1).toBe(obj2);
      expect(obj1.num).toBe(obj2.num);
    });

    it('should handle async factory providers', async () => {
      const domain = Domain.fromDefinition({
        name: 'test',
        provides: [
          bind('qwop').in(GLOBAL).toValue(32),
          bind('a').in(GLOBAL).toFactory({ inject: ['qwop'], fn: async (qwop: number) => qwop }),
        ],
      });

      const lifecycle = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);

      const result = await lifecycle.resolve(forKey('a'), domain);
      expect(result).toBe(32);
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

      const lifecycle = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);
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

      const lifecycle = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);

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

      const lifecycle = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);
      try {
        await lifecycle.resolve(forKey('b'), domain);
        expect('this should have failed').toBeFalsy();
      } catch (err) {
        expect(err.constructor).toBe(DependencyNotSatisfiedError);
      }
    });

    it ('can override a dependency from the parent lifecycle when done explicitly', async () => {
      const domain = Domain.fromDefinition({
        name: 'parent',
        provides: [
          bind('MyOverriddenThing').in(GLOBAL).toValue(1),
          bind('MyOverriddenThing').in(SINGLETON).toFactory({
            inject: ['MyOverriddenThing'],
            fn: (i) => i + 1000,
          }),
        ],
      });

      const global = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);
      const singleton = new LifecycleInstance(SINGLETON_LIFECYCLE, global, FallbackLogger);

      const retA = await global.resolve(forKey('MyOverriddenThing'), domain);
      expect(retA).toBe(1);

      const retB = await singleton.resolve(forKey('MyOverriddenThing'), domain);
      expect(retB).toBe(1001);
    });
  });

  describe('tests across lifecycles', () => {
    it('should check parents to satisfy dependencies', async () => {
      const global = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);
      const singleton = new LifecycleInstance(SINGLETON_LIFECYCLE, global, FallbackLogger);

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
      const global = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);
      const singleton = new LifecycleInstance(SINGLETON_LIFECYCLE, global, FallbackLogger);

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

    it('should use parent lifecycle temporaries when resolving upward', async () => {
      const global = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);
      const singleton = new LifecycleInstance(SINGLETON_LIFECYCLE, global, FallbackLogger);

      const domain = Domain.fromDefinition({
        name: 'test',
        provides: [
        ],
      });

      global.registerTemporary('a', 5);

      const retA = await global.resolve(forKey('a'), domain);
      expect(retA).toBe(5);
      const retB = await singleton.resolve(forKey('a'), domain);
      expect(retB).toBe(5);
    });

    it('should use local lifecycle temporaries before resolving to parent', async () => {
      const global = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);
      const singleton = new LifecycleInstance(SINGLETON_LIFECYCLE, global, FallbackLogger);

      const domain = Domain.fromDefinition({
        name: 'test',
        provides: [
        ],
      });

      global.registerTemporary('a', 5);
      singleton.registerTemporary('a', 10);

      const retA = await global.resolve(forKey('a'), domain);
      expect(retA).toBe(5);
      const retB = await singleton.resolve(forKey('a'), domain);
      expect(retB).toBe(10);
    });

    it('should resolve a dependency across lifecycles AND across scopes', async () => {
      const global = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);
      const singleton = new LifecycleInstance(SINGLETON_LIFECYCLE, global, FallbackLogger);

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

      @AutoComponent({ lifecycle: SINGLETON })
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

  it('should resolve a dependency for any alias of a lifecycle', async () => {
    const global = new LifecycleInstance(GLOBAL_LIFECYCLE, null, FallbackLogger);
    const singleton = new LifecycleInstance(SINGLETON_LIFECYCLE, global, FallbackLogger);

    const facetKey = Symbol.for(`test:Lifecycle:MyFacet`);
    const facetLifecycle: ILifecycle = {
      name: facetKey,
      parent: SINGLETON_LIFECYCLE,
      aliases: [FACET],
    };
    const facet = new LifecycleInstance(facetLifecycle, singleton, FallbackLogger);

    const subFacetKey = Symbol.for(`test:Lifecycle:MySubFacet`);
    const subFacetLifecycle: ILifecycle = {
      name: facetKey,
      parent: facetLifecycle,
      aliases: [SUB_FACET],
    };
    const subFacet = new LifecycleInstance(facetLifecycle, singleton, FallbackLogger);

    @AutoComponent({ lifecycle: facetKey })
    class A {}

    @AutoComponent({ lifecycle: FACET })
    class B {}


    const domain = Domain.fromDefinition({
      name: 'parent',
      provides: [A, B],
    });


    const retA = await facet.resolve(forKey(A), domain);
    expect(retA.constructor).toBe(A);

    const retB = await facet.resolve(forKey(B), domain);
    expect(retB.constructor).toBe(B);

  });
});

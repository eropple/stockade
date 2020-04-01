// tslint:disable: no-magic-numbers

import { FallbackLogger } from '@stockade/utils/logging';

import { AutoComponent, Inject } from '../annotations';
import { GLOBAL, LifecycleInstance, SINGLETON } from '../lifecycle';
import { bind } from './definition-helpers';
import { forKey } from './dependency-utils';
import { Domain } from './Domain';
import { IDomainDefinition } from './IDomainDefinition';

describe('Domain', () => {
  describe('static methods', () => {
    describe('fromDefinition()', () => {
      it('should resolve children from definitions', () => {
        const childDefn: IDomainDefinition = {
          name: 'child',
        };
        const parentDefn: IDomainDefinition = {
          name: 'parent',
          children: [childDefn],
        };

        const domain = Domain.fromDefinition(parentDefn);

        expect(domain.children).toHaveLength(1);
        expect(domain.children[0].parent).toBe(domain);
      });

      describe('imports', () => {
        it('should convert dependency keys to non-optional import definitions', () => {
          const defn: IDomainDefinition = {
            name: 'parent',
            children: [
              {
                name: 'child',
                imports: [
                  'ImportDependencyKey',
                ],
              },
            ],
          };

          const domain = Domain.fromDefinition(defn);

          expect(domain.children[0].imports).toHaveLength(1);
          expect(domain.children[0].imports[0])
            .toEqual({ key: forKey('ImportDependencyKey'), lifecycle: SINGLETON, optional: false });
        });

        it('should honor optional import definitions', () => {
          const defn: IDomainDefinition = {
            name: 'parent',
            children: [
              {
                name: 'child',
                imports: [
                  { key: 'ImportDependencyKey', optional: true },
                ],
              },
            ],
          };

          const domain = Domain.fromDefinition(defn);

          expect(domain.children[0].imports).toHaveLength(1);
          expect(domain.children[0].imports[0])
            .toEqual({ key: forKey('ImportDependencyKey'), lifecycle: SINGLETON, optional: true });
        });
      });

      describe('exports', () => {
        it('should convert autocomponents into domain exports with discovered lifecycles', () => {
          @AutoComponent()
          class DefaultConfigComponent {}

          @AutoComponent({ key: 'QWOP' })
          class SpecificKeyComponent {}

          @AutoComponent({ lifecycle: GLOBAL })
          class SpecificLifecycleComponent {}

          const defnA: IDomainDefinition = {
            name: 'test',
            exports: [
              DefaultConfigComponent,
            ],
          };

          const defnB: IDomainDefinition = {
            name: 'testB',
            exports: [
              SpecificKeyComponent,
            ],
          };

          const defnC: IDomainDefinition = {
            name: 'testC',
            exports: [
              SpecificLifecycleComponent,
            ],
          };

          const domainA = Domain.fromDefinition(defnA);
          expect(domainA.exports).toHaveLength(1);
          expect(domainA.exports[0])
            .toEqual({ key: Symbol.for('DefaultConfigComponent'), lifecycle: SINGLETON });

          const domainB = Domain.fromDefinition(defnB);
          expect(domainB.exports).toHaveLength(1);
          expect(domainB.exports[0])
            .toEqual({ key: Symbol.for('QWOP'), lifecycle: SINGLETON });

          const domainC = Domain.fromDefinition(defnC);
          expect(domainC.exports).toHaveLength(1);
          expect(domainC.exports[0])
            .toEqual({ key: Symbol.for('SpecificLifecycleComponent'), lifecycle: GLOBAL });
        });

        it('should normalize ExportDefinitions into a similar DomainExport', () => {
          const domain = Domain.fromDefinition({
            name: 'test',
            exports: [
              { key: 'ExportTest', lifecycle: GLOBAL },
            ],
          });

          expect(domain.exports).toHaveLength(1);
          expect(domain.exports[0]).toEqual({ key: forKey('ExportTest'), lifecycle: GLOBAL });
        });
      });

      describe('providers', () => {
        it('normalizes a value provider', () => {
          const domain = Domain.fromDefinition({
            name: 'test',
            provides: [
              bind('SomeKey').toValue(5),
            ],
          });

          expect(domain.provides).toHaveLength(1);
          expect(domain.provides[0]).toEqual({ key: forKey('SomeKey'), lifecycle: SINGLETON, value: 5 });
        });

        it('normalizes autocomponents to their spec (no args)', () => {
          @AutoComponent()
          class DefaultConfigComponent {}

          @AutoComponent({ key: 'QWOP' })
          class SpecificKeyComponent {}

          @AutoComponent({ lifecycle: GLOBAL })
          class SpecificLifecycleComponent {}

          const defnA: IDomainDefinition = {
            name: 'test',
            provides: [
              DefaultConfigComponent,
            ],
          };

          const defnB: IDomainDefinition = {
            name: 'testB',
            provides: [
              SpecificKeyComponent,
            ],
          };

          const defnC: IDomainDefinition = {
            name: 'testC',
            provides: [
              SpecificLifecycleComponent,
            ],
          };

          const domainA = Domain.fromDefinition(defnA);
          expect(domainA.provides).toHaveLength(1);
          expect(domainA.provides[0])
            .toMatchObject({
              key: Symbol.for('DefaultConfigComponent'),
              lifecycle: SINGLETON,
              inject: [],
              extractedFromAutoComponent: true,
            });

          const domainB = Domain.fromDefinition(defnB);
          expect(domainB.provides).toHaveLength(1);
          expect(domainB.provides[0])
            .toMatchObject({
              key: Symbol.for('QWOP'),
              lifecycle: SINGLETON,
              inject: [],
              extractedFromAutoComponent: true,
            });

          const domainC = Domain.fromDefinition(defnC);
          expect(domainC.provides).toHaveLength(1);
          expect(domainC.provides[0])
            .toMatchObject({
              key: Symbol.for('SpecificLifecycleComponent'),
              lifecycle: GLOBAL,
              inject: [],
              extractedFromAutoComponent: true,
            });
        });

        it('normalizes autocomponents with constructor args', () => {
          @AutoComponent()
          class Dependency {
            constructor() {}
          }

          @AutoComponent()
          class ConstructorInjectionParameters {
            constructor(
              dep: Dependency,
              @Inject('SomeKeyThing') someKeyThing: number,
            ) {}
          }

          const domain = Domain.fromDefinition({
            name: 'test',
            provides: [ConstructorInjectionParameters],
          });
          expect(domain.provides).toHaveLength(1);
          expect(domain.provides[0])
            .toMatchObject({
              key: Symbol.for('ConstructorInjectionParameters'),
              lifecycle: SINGLETON,
              inject: [Symbol.for('Dependency'), Symbol.for('SomeKeyThing')],
              extractedFromAutoComponent: true,
            });
        });

        it('resolves dynamic providers', async () => {
          const domain = Domain.fromDefinition({
            name: 'test',
            dynamicProviders: (d, key, lcInstance, exp) => {
              if (lcInstance.lifecycle === GLOBAL) {
                const [domainName, token] = (key.description ?? 'WTF?!').split(':');
                // not actually handled by this domain, so bail
                if (domainName !== d.name || !token) {
                  return null;
                }

                return bind(key).in(lcInstance.lifecycle).toValue(parseInt(token, 10));
              }

              return null;
            },
          });

          const global = new LifecycleInstance(GLOBAL, null, FallbackLogger);

          expect(await domain.resolveProvider(Symbol.for('test:123'), global))
            .toMatchObject({ key: Symbol.for('test:123'), value: 123 });
        });
      });
    });
  });
});

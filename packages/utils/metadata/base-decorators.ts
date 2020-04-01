import * as _ from 'lodash';
import 'reflect-metadata';
import { Class } from 'utility-types';

import { PropertyOf, StringTo } from '../types';

/**
 * So this one requires a little explanation.
 *
 * TypeScript, in its infinite and baffling wisdom, does not provide the runtime
 * type metadata (`design:type`, `design:paramtypes`, and `design:returntype`)
 * unless a decorator is called on whatever it is you need a decorator for. In
 * Stockade, `@AutoComponent` is required on anything that might be injected so
 * this is a little less of a problem, but other users, and tests, might have a need
 * for something that just makes sure that metadata is applied at all.
 */
export function NoMetadata(): any {
  return () => {};
}

export function getAllMetadataForClass(cls: Class<any>): Readonly<StringTo<any>> {
  return Object.fromEntries(Reflect.getMetadataKeys(cls).map(k => [k, Reflect.getMetadata(k, cls)]));
}

export function getAllPropertyMetadataForClass<
  T extends Object,
  P extends PropertyOf<T>
>(cls: Class<T>, key: P): Readonly<StringTo<any>> {
  const keys = Reflect.getMetadataKeys(cls.prototype, key);
  const pairs = keys.map(k => [k, Reflect.getMetadata(k, cls.prototype, key)]);

  return Object.fromEntries(pairs);
}

export function setMetadata<V>(
  metadataKey: string,
  metadataValue: V,
  target: any,
  key?: string | symbol,
) {
  if (key) {
    Reflect.defineMetadata(metadataKey, metadataValue, target, key);
  } else {
    Reflect.defineMetadata(metadataKey, metadataValue, target);
  }
}

export function appendArrayMetadata<V>(
  metadataKey: string,
  metadataValue: V | Array<V>,
  target: any,
  key?: string | symbol,
) {
  const current =
    (key
      ? Reflect.getMetadata(metadataKey, target, key)
      : Reflect.getMetadata(metadataKey, target)) || [];
  const values: Array<V> = [ ...current, ...([metadataValue].flat(Infinity)) ];

  if (key) {
    Reflect.defineMetadata(metadataKey, values, target, key);
  } else {
    Reflect.defineMetadata(metadataKey, values, target);
  }
}

export function extendObjectMetadata(
  metadataKey: string,
  metadataValue: { [key: string]: any },
  target: any,
  key?: string | symbol,
  defaultValue: { [key: string]: any } = {},
) {
  const current =
    (key
      ? Reflect.getMetadata(metadataKey, target, key)
      : Reflect.getMetadata(metadataKey, target)) || defaultValue;
  const values = { ...current, ...metadataValue };

  if (key) {
    Reflect.defineMetadata(metadataKey, values, target, key);
  } else {
    Reflect.defineMetadata(metadataKey, values, target);
  }
}

export function AppendArrayMetadata<V>(
  metadataKey: string,
  metadataValue: V | Array<V>,
): any {
  return (target: object, key?: any, descriptor?: any) => {
    let actualReturn: object = target;

    if (key && !descriptor) {
      // This is a really weird behavior and I don't pretend to fully understand it,
      // but apparently TypeScript doesn't define `writable` on properties in all
      // use cases where you're using them.
      Object.defineProperty(target, key, {
        enumerable: true,
        writable: true,
      });
    } else if (descriptor) {
      actualReturn = descriptor;
    }

    appendArrayMetadata(metadataKey, metadataValue, target, key);

    return actualReturn;
  };
}

export function ExtendObjectMetadata<V extends object>(
  metadataKey: string,
  metadataValue: Partial<V>,
  defaultValue: V,
): any {
  return (target: object, key?: any, descriptor?: any) => {
    let actualReturn: object = target;

    if (key && !descriptor) {
      // This is a really weird behavior and I don't pretend to fully understand it,
      // but apparently TypeScript doesn't define `writable` on properties in all
      // use cases where you're using them.
      Object.defineProperty(target, key, {
        enumerable: true,
        writable: true,
      });
    } else if (descriptor) {
      actualReturn = descriptor;
    }

    extendObjectMetadata(metadataKey, metadataValue, target, key, defaultValue);

    return actualReturn;
  };
}

export function SetMetadata<V = any>(
  metadataKey: string,
  metadataValue: V,
): any {
  return (target: object, key?: any, descriptor?: any) => {
    let actualReturn: object = target;

    if (key && !descriptor) {
      // This is a really weird behavior and I don't pretend to fully understand it,
      // but apparently TypeScript doesn't define `writable` on properties in all
      // use cases where you're using them.
      Object.defineProperty(target, key, {
        enumerable: true,
        writable: true,
      });
    } else if (descriptor) {
      actualReturn = descriptor;
    }

    setMetadata(metadataKey, metadataValue, target, key);

    return actualReturn;
  };
}

export const SetMetadatas = (
  props: { [metadataKey: string]: any },
  writable: boolean = false,
): any => (target: object, key?: any, descriptor?: any) => {
  let actualTarget: object = target;
  let actualReturn: object = target;

  if (key && !descriptor) {
    // This is a really weird behavior and I don't pretend to fully understand it,
    // but apparently TypeScript doesn't define `writable` on properties in all
    // use cases where you're using them.
    Object.defineProperty(target, key, {
      writable: true,
      enumerable: true,
    });
  } else if (descriptor) {
    actualTarget = descriptor.value;
    actualReturn = descriptor;
  }

  const pairs = _.toPairs(props);
  for (const pair of pairs) {
    key
      ? Reflect.defineMetadata(pair[0], pair[1], actualTarget, key)
      : Reflect.defineMetadata(pair[0], pair[1], actualTarget);
  }

  return actualReturn;
};

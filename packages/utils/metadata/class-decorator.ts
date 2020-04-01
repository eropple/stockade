import 'reflect-metadata';

import { ExtendObjectMetadata, SetMetadata } from './base-decorators';

export interface IClassSetMetadata<TValueType> {
  decorator: (value: TValueType) => ClassDecorator;
  getter: (target: object) => TValueType | null;
}

export interface IClassMergeObjectMetadata<TValueType extends object> {
  decorator: (value?: Partial<TValueType>) => ClassDecorator;
  getter: (target: object) => TValueType | null;
}

export function classSetMetadata<TValueType>(key: string): IClassSetMetadata<TValueType> {
  return {
    decorator: (value) => SetMetadata<TValueType>(key, value),
    getter: (target) => Reflect.getMetadata(key, target) || null,
  };
}

export function classMergeObjectMetadata<
  TValueType extends object
>(key: string, startingValue: TValueType): IClassMergeObjectMetadata<TValueType> {
  return {
    decorator:
      (value: Partial<TValueType> = {}) => ExtendObjectMetadata<TValueType>(key, value, startingValue),
    getter: (target) => Reflect.getMetadata(key, target) || null,
  };
}

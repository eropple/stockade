import 'reflect-metadata';

import { PropertyOf } from '../types';
import { SetMetadata } from './base-decorators';

export interface IPropertySetMetadata<TClass extends Object, TValueType> {
  decorator: (value: TValueType) => PropertyDecorator;
  getter: <V extends PropertyOf<TClass>>(target: TClass, propertyKey: V) => TValueType | null;
}

export function propertySetMetadata<
  TClass extends Object,
  TValueType,
>(metadataKey: string): IPropertySetMetadata<TClass, TValueType> {
  return {
    decorator: (value) => SetMetadata(metadataKey, value),
    getter: (target, propertyKey) => Reflect.getMetadata(metadataKey, target, propertyKey) || null,
  };
}

import 'reflect-metadata';
import { Class } from 'utility-types';

import { PropertyOf, StringTo } from '../types';
import { getAllMetadataForClass, getAllPropertyMetadataForClass, setMetadata } from './base-decorators';

// IMPORTANT NOTE
//
// To the best of my knowledge, there is no good standard for acquiring metadata
// about a parameter of a method inside of NodeJS/TypeScript. This is, and this
// is a technical term, A Bummer. However, to try to do something about that,
// we've defined `STOCKADE_PARAMETER_METADATA_KEY` as a guaranteed key of
// anything working with this stuff. It will always return `ParameterMetadata`,
// whether any exists or not, as a map of parameter position to key-value
// metadata.

export const STOCKADE_PARAMETER_METADATA_KEY = '@stockade/utils:PARAMETER_METADATA';

/**
 * The runtime (as in "JavaScript runtime")-provided type of a property.
 */
export const DESIGN_TYPE = 'design:type';

/**
 * The runtime (as in "JavaScript runtime")-provided parameter types from a method.
 */
export const PARAMETER_DESIGN_TYPE = 'design:paramtype';
/**
 * The runtime (as in "JavaScript runtime")-provided return type from a method.
 */
export const RETURN_DESIGN_TYPE = 'design:returntype';

export interface IParameterMetadata {
  [PARAMETER_DESIGN_TYPE]?: Class<any>;

  [key: string]: any;
}
export type AllParameterMetadata = Map<number, IParameterMetadata>;
export type ReadonlyAllParameterMetadata = ReadonlyMap<number, IParameterMetadata>;

export function getPropertyParameterMetadataForClass<
  T extends Object,
  P extends PropertyOf<T>
>(cls: Class<T>, propertyKey: P): ReadonlyAllParameterMetadata {
  const ret = getAllPropertyMetadataForClass(cls, propertyKey)[STOCKADE_PARAMETER_METADATA_KEY];

  return ret || new Map();
}

export function getConstructorParameterMetadataForClass<
  T extends Object
>(cls: Class<T>): ReadonlyAllParameterMetadata {
  return _ensurePositionalConstructorMetadataForClass(cls);
}

function _setPropertyParameterMetadataForClass(
  cls: Class<any>,
  key: string | symbol,
  metadata: AllParameterMetadata,
) {
  Reflect.defineMetadata(STOCKADE_PARAMETER_METADATA_KEY, metadata, cls, key);
}

function _setConstructorParameterMetadataForClass(
  cls: Class<any>,
  metadata: AllParameterMetadata,
) {
  Reflect.defineMetadata(STOCKADE_PARAMETER_METADATA_KEY, metadata, cls);
}

function _getPropertyParameterMetadataForClass(
  cls: Class<any>,
  key: string | symbol,
): AllParameterMetadata | null {
  return Reflect.getMetadata(STOCKADE_PARAMETER_METADATA_KEY, cls, key) || null;
}

function _getConstructorParameterMetadataForClass(cls: Class<any>): AllParameterMetadata | null {
  return Reflect.getMetadata(STOCKADE_PARAMETER_METADATA_KEY, cls) || null;
}

function _getPositionalParameterMetadata(
  cls: Class<any>,
  key: string | symbol,
  index: number,
): IParameterMetadata {
  const metadata = _ensurePositionalPropertyMetadataForClass(cls, key);

  let parameterMetadata = metadata.get(index);
  if (!parameterMetadata) {
    const newMetadata = new Map(metadata);

    parameterMetadata = {};
    newMetadata.set(index, parameterMetadata);

    _setPropertyParameterMetadataForClass(cls, key, newMetadata);
  }

  return parameterMetadata;
}
function _setPositionalParameterMetadata(
  cls: any,
  key: string | symbol,
  index: number,
  metadataKey: string,
  metadataValue: any,
) {
  const allParameterMetadata = _ensurePropertyParameterMetadataForClass(cls, key);
  const parameterMetadata = _getPositionalParameterMetadata(cls, key, index);

  const newParameterMetadata = { ...parameterMetadata, [metadataKey]: metadataValue };
  allParameterMetadata.set(index, newParameterMetadata);
}

function _ensurePropertyParameterMetadataForClass(
  cls: Class<any>,
  propertyKey: string | symbol,
): AllParameterMetadata {
  let metadata = _getPropertyParameterMetadataForClass(cls, propertyKey);

  if (!metadata) {
    metadata = new Map();
    _setPropertyParameterMetadataForClass(cls, propertyKey, metadata);
  }

  return metadata;
}

function _ensureConstructorParameterMetadataForClass(
  cls: Class<any>,
): AllParameterMetadata {
  let metadata = _getConstructorParameterMetadataForClass(cls);

  if (!metadata) {
    metadata = new Map();
    _setConstructorParameterMetadataForClass(cls, metadata);
  }

  return metadata;
}

function _ensurePositionalPropertyMetadataForClass(
  cls: Class<any>,
  propertyKey: string | symbol,
): AllParameterMetadata {
  const allParameterMetadata = _ensurePropertyParameterMetadataForClass(cls, propertyKey);

  // We only need to do this once. However, figuring out _where_ to do it in the lifecycle
  // is pretty prohibitive. Stockade attempts to do all of this once-and-only-once at startup,
  // to minimize its impact, but it's hard to understand the most efficient way to make these
  // calls cheap.
  const designParamTypes: Array<any> = Reflect.getMetadata('design:paramtypes', cls, propertyKey) || [];
  designParamTypes!.forEach((t, idx) => {
    const param = allParameterMetadata.get(idx);
    if (!param || !param[PARAMETER_DESIGN_TYPE]) {
      const newParam = { ...(param || {}), [PARAMETER_DESIGN_TYPE]: t };

      allParameterMetadata.set(idx, newParam);
    }
  });

  return allParameterMetadata;
}

function _ensurePositionalConstructorMetadataForClass(cls: Class<any>) {
  const allParameterMetadata = _ensureConstructorParameterMetadataForClass(cls);

  // We only need to do this once. However, figuring out _where_ to do it in the lifecycle
  // is pretty prohibitive. Stockade attempts to do all of this once-and-only-once at startup,
  // to minimize its impact, but it's hard to understand the most efficient way to make these
  // calls cheap.
  const designParamTypes: Array<any> = Reflect.getMetadata('design:paramtypes', cls) || [];
  designParamTypes.forEach((t, idx) => {
    const param = allParameterMetadata.get(idx);
    if (!param || !param[PARAMETER_DESIGN_TYPE]) {
      const newParam = { ...(param || {}), [PARAMETER_DESIGN_TYPE]: t };

      allParameterMetadata.set(idx, newParam);
    }
  });

  return allParameterMetadata;
}

export function setPropertyParameterMetadata<
  T extends Object,
  P extends PropertyOf<T>
>(
  cls: Class<T>,
  propertyKey: P,
  parameterIndex: number,
  parameterMetadataKey: string,
  parameterMetadataValue: any,
) {
  _setPositionalParameterMetadata(
    cls,
    propertyKey,
    parameterIndex,
    parameterMetadataKey,
    parameterMetadataValue,
  );
}

export function appendArrayPropertyParameterMetadata<
  T extends Object,
  P extends PropertyOf<T>,
  V
>(
  cls: Class<T>,
  propertyKey: P,
  parameterIndex: number,
  parameterMetadataKey: string,
  parameterMetadataValues: V | Array<V>,
) {
  const currentParameterValue: Array<V> =
    _getPositionalParameterMetadata(cls, propertyKey, parameterIndex)[parameterMetadataKey];
  const newParameterValues: Array<V> =
    [ ...currentParameterValue, ...[parameterMetadataValues].flat(Infinity) ];

  setPropertyParameterMetadata(cls, propertyKey, parameterIndex, parameterMetadataKey, newParameterValues);
}

export function extendObjectPropertyParameterMetadata<
  T extends Object,
  P extends PropertyOf<T>,
  V = any
>(
  cls: Class<T>,
  propertyKey: P,
  parameterIndex: number,
  parameterMetadataKey: string,
  parameterMetadataValues: StringTo<V>,
) {
  const currentParameterValue: StringTo<V> =
    _getPositionalParameterMetadata(cls, propertyKey, parameterIndex)[parameterMetadataKey];
  const newParameterValues: StringTo<V> = { ...currentParameterValue, ...parameterMetadataValues };

  setPropertyParameterMetadata(cls, propertyKey, parameterIndex, parameterMetadataKey, newParameterValues);
}

// TODO: can the types below be clearer? I know (I think?) it'll be fine, but TypeScript doesn't.

export function AppendArrayMetadataForParameter<V>(
  metadataKey: string,
  metadataValue: V | Array<V>,
): ParameterDecorator {
  return (target: object, key: string | symbol, parameterIndex: number) => {
    appendArrayPropertyParameterMetadata(
      target as any, key as any, parameterIndex, metadataKey, metadataValue,
    );
  };
}

export function ExtendObjectMetadataForParameter<V extends object>(
  metadataKey: string,
  metadataValue: Partial<V>,
): ParameterDecorator {
  return (target: object, key: string | symbol, parameterIndex: number) => {
    extendObjectPropertyParameterMetadata(
      target as any, key as any, parameterIndex, metadataKey, metadataValue,
    );
  };
}

export function SetMetadataForParameter<V = any>(
  metadataKey: string,
  metadataValue: V,
): ParameterDecorator {
  return (target: object, key: string | symbol, parameterIndex: number) => {
    setPropertyParameterMetadata(target as any, key as any, parameterIndex, metadataKey, metadataValue);
  };
}

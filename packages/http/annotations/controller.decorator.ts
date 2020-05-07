import 'reflect-metadata';
import { Class } from 'utility-types';

import { classMergeObjectMetadata, classSetMetadata } from '@stockade/utils/metadata';

import { IMappedController, IMappedControllerInfo } from '../types/controller-info';
import { AnnotationKeys } from './keys';

export const DEFAULT_ARGS: IMappedControllerInfo = {
  basePath: '/',
};

const {
  decorator: _Controller,
  getter: gcm,
} = classMergeObjectMetadata<IMappedControllerInfo>(AnnotationKeys.CONTROLLER_INFO, DEFAULT_ARGS);

export const getControllerMetadata = gcm;
export function Controller(value?: Partial<IMappedControllerInfo>): ClassDecorator {
  return (target) => {
    // TODO:  can we add a custom name here?
    //        it would be nice for `console.log(controllerClass)` to emit something like
    //        [StockadeControllerClass: FooController] when console.logged.
    _Controller(value)(target);
  };
}

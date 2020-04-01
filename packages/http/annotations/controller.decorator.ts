import 'reflect-metadata';

import { classMergeObjectMetadata, classSetMetadata } from '@stockade/utils/metadata';

import { IMappedControllerInfo } from '../facet/controller-info';
import { AnnotationKeys } from './keys';

export const DEFAULT_ARGS: IMappedControllerInfo = {
  basePath: '/',
};

export const {
  decorator: Controller,
  getter: getControllerMetadata,
} = classMergeObjectMetadata<IMappedControllerInfo>(AnnotationKeys.CONTROLLER_INFO, DEFAULT_ARGS);

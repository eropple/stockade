import 'reflect-metadata';

import { IModule } from '@stockade/core';
import { Domain } from '@stockade/inject';
import {
  getAllMetadataForClass,
  getAllPropertyMetadataForClass,
  getPropertyParameterMetadataForClass,
} from '@stockade/utils/metadata';

import { ControllerClass } from '../types';
import { IMappedController, IMappedEndpointDetailed, isMappedControllerBasic, isMappedEndpointBasic } from './controller-info';

export function extractMappedControllerMetadata(
  controller: ControllerClass,
  domain: Domain<IModule>,
): IMappedController {
  const controllerBase: any = getAllMetadataForClass(controller);
  if (!isMappedControllerBasic(controllerBase)) {
    throw new Error(`Controller class '${controller.name}' lacks Controller annotation.`);
  }

  return {
    ...controllerBase,
    controller,
    domain,
    endpoints: extractMappedEndpointMetadata(controller),
  };
}

function extractMappedEndpointMetadata(
  controller: ControllerClass,
): { [name: string]: IMappedEndpointDetailed } {
  const ret: { [name: string]: IMappedEndpointDetailed } = {};

  for (const handlerName of Object.getOwnPropertyNames(controller.prototype)) {
    if (handlerName === 'constructor') { continue; }
    const endpointBasicInfo = getAllPropertyMetadataForClass(controller, handlerName);

    if (!isMappedEndpointBasic(endpointBasicInfo)) { continue; }

    const parameters = getPropertyParameterMetadataForClass(controller, handlerName);

    ret[handlerName] = {
      ...endpointBasicInfo,
      controller,
      handlerName,
      parameters,
    };
  }

  return ret;
}

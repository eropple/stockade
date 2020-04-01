import * as _ from 'lodash';

import { IAppSpec, IModule } from '@stockade/core';
import { Domain } from '@stockade/inject';
import { isClass } from '@stockade/utils/type-guards';

import { IFastifyHookDefinition } from '../hooks';
import {
  hasOnErrorHook,
  hasOnRequestHook,
  hasOnResponseHook,
  hasOnSendHook,
  hasPreHandlerHook,
  hasPreParsingHook,
  hasPreSerializationHook,
  hasPreValidationHook,
} from '../hooks/helpers';
import { isHttpModule } from '../IHttpModule';
import { ControllerClass } from '../types';

export function findControllers(
  rootDomain: Domain<IModule>,
): ReadonlyArray<[ControllerClass, Domain<IModule>]> {
  const ret: Array<[ControllerClass, Domain<IModule>]> = [];

  for (const domain of [rootDomain, ...rootDomain.descendants]) {
    const defn = domain.definition;

    if (isHttpModule(defn) && defn.controllers) {
      for (const controller of defn.controllers) {
        ret.push([controller, domain]);
      }
    }
  }

  return ret;
}

export function findHooks(
  rootDomain: Domain<IModule>,
): ReadonlyArray<[IFastifyHookDefinition, Domain<IModule>]> {
  const ret: Array<[IFastifyHookDefinition, Domain<IModule>]> = [];

  for (const domain of [rootDomain, ...rootDomain.descendants]) {
    const defn = domain.definition;

    if (isHttpModule(defn) && defn.hooks) {
      for (const hook of defn.hooks) {
        const value = isClass(hook) ? { class: hook, weight: 0 } : hook;
        ret.push([value, domain]);
      }
    }
  }

  return ret;
}

export function extractHooks(hookDefs: ReadonlyArray<[IFastifyHookDefinition, Domain<IModule>]>) {
  return {
    onRequest:
      _.sortBy(hookDefs.filter(h => hasOnRequestHook(h[0].class)), h => h[0].weight ?? 0),
    preParsing:
      _.sortBy(hookDefs.filter(h => hasPreParsingHook(h[0].class)), h => h[0].weight ?? 0),
    preValidation:
      _.sortBy(hookDefs.filter(h => hasPreValidationHook(h[0].class)), h => h[0].weight ?? 0),
    preHandler:
      _.sortBy(hookDefs.filter(h => hasPreHandlerHook(h[0].class)), h => h[0].weight ?? 0),
    preSerialization:
      _.sortBy(hookDefs.filter(h => hasPreSerializationHook(h[0].class)), h => h[0].weight ?? 0),
    onError:
      _.sortBy(hookDefs.filter(h => hasOnErrorHook(h[0].class)), h => h[0].weight ?? 0),
    onSend:
      _.sortBy(hookDefs.filter(h => hasOnSendHook(h[0].class)), h => h[0].weight ?? 0),
    onResponse:
      _.sortBy(hookDefs.filter(h => hasOnResponseHook(h[0].class)), h => h[0].weight ?? 0),
  };
}

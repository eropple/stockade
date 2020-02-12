import * as _ from 'lodash';
import { Class } from 'utility-types';

import { IAppSpec, mapModules } from '@stockade/core';

import { IFastifyHookDefinition } from '../hooks';
import { isHttpModule } from '../IHttpModule';

export function findControllers(appSpec: IAppSpec) {
  return mapModules<Class<any>>(
    appSpec,
    (m) => {
      if (isHttpModule(m) && m.controllers) {
        return [...m.controllers];
      }

      return [];
    },
  );
}

export function findHooks(appSpec: IAppSpec) {
  return mapModules<IFastifyHookDefinition>(
    appSpec,
    (m) => {
      if (isHttpModule(m) && m.hooks) {
        return m.hooks.map(h => {
          if (typeof(h) === 'function') {
            return { class: h, weight: 0 };
          }

          return h;
        });
      }

      return [];
    },
  ).sort((a, b) => ((a.weight ?? 0) - (b.weight ?? 0)));
}

export function extractHooks(hookDefs: Array<IFastifyHookDefinition>) {
  return {
    onRequest: _.sortBy(hookDefs.filter(h => h.class.prototype.onRequest), h => h.weight ?? 0),
    preParsing: _.sortBy(hookDefs.filter(h => h.class.prototype.preParsing), h => h.weight ?? 0),
    preValidation: _.sortBy(hookDefs.filter(h => h.class.prototype.preValidation), h => h.weight ?? 0),
    preSerialization: _.sortBy(hookDefs.filter(h => h.class.prototype.preSerialization), h => h.weight ?? 0),
    onError: _.sortBy(hookDefs.filter(h => h.class.prototype.onError), h => h.weight ?? 0),
    onSend: _.sortBy(hookDefs.filter(h => h.class.prototype.onSend), h => h.weight ?? 0),
    onResponse: _.sortBy(hookDefs.filter(h => h.class.prototype.onResponse), h => h.weight ?? 0),
  };
}

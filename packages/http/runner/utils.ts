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

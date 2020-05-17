import { HTTPMethod } from 'fastify';

import { StringTo } from '@stockade/utils/types';

export function assembleUrlPath(...pathBits: ReadonlyArray<string | undefined>): string {
  const concatenated = pathBits.filter(i => i).map(s => stripPathSlashes(s!)).join('/');
  const ret = stripPathSlashes(concatenated);

  return `/${ret}`;
}

export function stripPathSlashes(path: string) {
  return path.replace(/^\//, '').replace(/\/$/, '');
}

export const HTTPMethodsWithBodies: ReadonlySet<HTTPMethod> =
    new Set(['PATCH', 'POST', 'PUT']);

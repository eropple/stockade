import { HTTPMethod } from 'fastify';

export function stripPathSlashes(path: string) {
  return path.replace(/^\//, '').replace(/\/$/, '');
}
export const HTTPMethodsWithBodies: ReadonlySet<HTTPMethod> =
    new Set(['PATCH', 'POST', 'PUT']);

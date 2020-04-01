import { Class } from 'utility-types';

export function isClass(o: any): o is Class<any> {
  return !!o.constructor;
}

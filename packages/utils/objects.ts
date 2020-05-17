import { StringTo } from './types';

export function getPropertyCaseInsensitively<T>(property: string, obj: StringTo<T>): T | undefined {
  const key = Object.keys(obj).find(k => k.toLowerCase() === property.toLowerCase());

  return key ? obj[key] : undefined;
}

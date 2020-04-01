import { Funcifiable, funcify } from '../funcify';

const TRUE_VALUES: Set<string | undefined> = new Set([
  '1',
  'yes',
  'true',
]);

export function envOrFail(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`process.env.${key} must be set.`);
  }

  return value;
}

export function envOrFallback(key: string, fallback: Funcifiable<string>) {
  let value = process.env[key];
  if (!value) {
    value = funcify(fallback);
  }

  return value;
}

export function envIntOrFail(key: string): number {
  const envVar = envOrFail(key);

  const value = parseInt(envVar, 10);
  if (!value) {
    throw new Error(`process.env.${key} must be an integer.`);
  }

  return value;
}

export function envIntOrFallback(key: string, fallback: Funcifiable<number>) {
  const envVar = process.env[key];
  let value: number;

  if (!envVar) {
    value = funcify(fallback);
  } else {
    value = parseInt(envVar, 10);
    if (!value) {
      throw new Error(`process.env.${key} must be an integer.`);
    }
  }

  return value;
}

export function envBoolean(key: string): boolean {
  return !!(TRUE_VALUES.has(process.env['key']));
}

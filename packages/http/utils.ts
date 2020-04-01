export function stripPathSlashes(path: string) {
  return path.replace(/^\//, '').replace(/\/$/, '');
}

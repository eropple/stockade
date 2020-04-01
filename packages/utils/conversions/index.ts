export function prettyPrintKeys(keys: Iterable<symbol>) {
  return [...keys].map(i => i.description).join(', ');
}

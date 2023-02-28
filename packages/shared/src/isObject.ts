export function isObject(x: unknown): x is object {
  return typeof x === 'object' && x !== null;
}

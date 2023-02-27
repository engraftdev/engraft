export function isObject(x: unknown): x is object {
  return typeof x === 'object' && x !== null;
}

export function hasProperty<K extends PropertyKey>(obj: unknown, key: K): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

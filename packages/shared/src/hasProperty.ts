import { isObject } from "./isObject.js";

export function hasProperty<K extends PropertyKey>(obj: unknown, key: K): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

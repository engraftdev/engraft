import update, { Spec } from "immutability-helper";

export function updateF<T>($spec: Spec<T>): (object: T) => T {
  return (object) => update(object, $spec);
}

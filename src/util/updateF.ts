import update, { Spec } from "immutability-helper";

export function updateF<T>($spec: Spec<T>, def: T): (object: T | undefined) => T;
export function updateF<T>($spec: Spec<T>): (object: T) => T;
export function updateF<T>($spec: Spec<T>, def?: T) {
  if (def === undefined) {
    return (object: T) => update(object, $spec);
  } else {
    return (object: T) => update(object || def, $spec);
  }
}

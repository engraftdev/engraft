import { isObject } from "./hasProperty";

export type Eq<T> = (x1: T, x2: T) => boolean;

export const refEq: Eq<any> = (a: unknown, b: unknown) => {
  return a === b;
}

export function objEqWith(eq: Eq<any>): Eq<object> {
  return (o1: unknown, o2: unknown) => {
    if (o1 === o2) { return true; }
    if (!isObject(o1) || !isObject(o2)) { return false; }
    const keys1 = Object.keys(o1);
    const keys2 = Object.keys(o2);
    if (keys1.length !== keys2.length) {
      return false;
    }
    for (let key of keys1) {
      if (!eq((o1 as any)[key], (o2 as any)[key])) {
        return false;
      }
    }
    return true;
  }
}
export const objEqWithRefEq = objEqWith(refEq);

export function arrEqWith<T, U extends (readonly T[]) | T[]>(eq: Eq<T>): Eq<U> {
  return (a1: unknown, a2: unknown) => {
    if (a1 === a2) { return true; }
    if (!Array.isArray(a1) || !Array.isArray(a2)) { return false; }
    if (a1.length !== a2.length) {
      return false;
    }
    for (let i = 0; i < a1.length; i++) {
      if (!eq(a1[i], a2[i])) {
        return false;
      }
    }
    return true;
  }
}
export const arrEqWithRefEq = arrEqWith(refEq);

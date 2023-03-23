import { isObject } from "./isObject.js";

export type Eq<T> = (x1: T, x2: T) => boolean;

export function refEq<T>(a: T, b: T) {
  return a === b;
}

export function objEqWith<T>(eq: Eq<T>): Eq<Record<string, T>> {
  return (o1, o2) => {
    if (o1 === o2) { return true; }
    if (!isObject(o1) || !isObject(o2)) { return false; }
    const keys1 = Object.keys(o1);
    const keys2 = Object.keys(o2);
    if (keys1.length !== keys2.length) {
      return false;
    }
    for (let key of keys1) {
      const val1: T | undefined = o1[key];
      const val2: T | undefined = o2[key];
      if (!eq(val1, val2)) {
        return false;
      }
    }
    return true;
  }
}
export const objEqWithRefEq = objEqWith(refEq) as Eq<object>;

// export function arrEqWith<T, U extends (readonly T[]) | T[]>(eq: Eq<T>): Eq<U> {
export function arrEqWith<T>(eq: Eq<T>): Eq<T[]> {
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

export function setEqWithRefEq<T>(s1: Set<T>, s2: Set<T>): boolean {
  if (s1.size !== s2.size) { return false; }
  for (let elem of s1) {
    if (!s2.has(elem)) {
      return false;
    }
  }
  return true;
}
// note that setEqWith(someOtherEq) is harder to implement & probably quadratic

export function recordEqWith<T>(eqs: { [K in keyof T]: Eq<T[K]> }): Eq<T> {
  return (o1: T, o2: T) => {
    if (o1 === o2) { return true; }
    for (let key in eqs) {
      if (!eqs[key](o1[key], o2[key])) {
        return false;
      }
    }
    return true;
  }
}

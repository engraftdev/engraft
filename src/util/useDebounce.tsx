import { useRef } from "react";

type Eq<T> = (x1: T, x2: T) => boolean;

export default function useDebounce<T extends object>(t: T, eq: Eq<T>): T {
  const lastT = useRef<T>();

  if (t === lastT.current) {
    return lastT.current;
  }
  if (lastT.current && eq(t, lastT.current)) {
    return lastT.current;
  }

  lastT.current = t;
  return lastT.current;
}

export const refEq: Eq<any> = (a: unknown, b: unknown) => {
  return a === b;
}

export function objEqWith(eq: Eq<any>): Eq<object> {
  return (o1: any, o2: any) => {
    const keys1 = Object.keys(o1);
    const keys2 = Object.keys(o2);
    if (keys1.length !== keys2.length) {
      return false;
    }
    for (let key of keys1) {
      if (!eq(o1[key], o2[key])) {
        return false;
      }
    }
    return true;
  }
}

export function arrEqWith<T>(eq: Eq<T>): Eq<T[]> {
  return (a1: any, a2: any) => {
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
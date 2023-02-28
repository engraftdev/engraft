import { useRef } from "react";
import { Eq } from "@engraft/shared/src/eq";

export function useDedupe<T>(t: T, eq: Eq<T>): T {
  const lastT = useRef<T>();

  if (!lastT.current || (t !== lastT.current && !eq(t, lastT.current))) {
    lastT.current = t;
  }

  return lastT.current;
}

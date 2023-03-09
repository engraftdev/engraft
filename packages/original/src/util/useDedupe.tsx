import { useRef } from "react";
import { Eq } from "@engraft/shared/dist/eq";

export function useDedupe<T>(t: T, eq: Eq<T>): T {
  const lastT = useRef<T>();

  if (!lastT.current || (t !== lastT.current && !eq(t, lastT.current))) {
    lastT.current = t;
  }

  return lastT.current;
}

import { useRef } from "react";
import { Incr } from ".";

export function useIncr<Args extends any[], Return>(incr: Incr<Args, Return>, ...args: Args) {
  const memoryRef = useRef(Incr.createMemory());
  return incr(memoryRef.current, ...args);
}

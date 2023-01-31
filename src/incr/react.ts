import { useRef } from "react";
import { Incr, IncrMemory } from ".";

export function useIncr<Args extends any[], Return>(incr: Incr<Args, Return>, ...args: Args) {
  const memoryRef = useRef(new IncrMemory());
  return incr(memoryRef.current, ...args);
}

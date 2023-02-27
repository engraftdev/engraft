import { useRef } from "react";
import { IncrFunction, IncrMemory } from ".";

export function useIncr<Args extends any[], Return>(incr: IncrFunction<Args, Return>, ...args: Args) {
  const memoryRef = useRef(new IncrMemory());
  return incr(memoryRef.current, ...args);
}

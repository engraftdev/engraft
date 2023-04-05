import { useRef } from "react";
import { Refunction, RefuncMemory } from "@engraft/refunc";

export function useRefunction<Args extends any[], Return>(f: Refunction<Args, Return>, ...args: Args) {
  const memoryRef = useRef(new RefuncMemory());
  return f(memoryRef.current, ...args);
}

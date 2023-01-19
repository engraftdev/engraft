import { useRef } from "react";
import { Mento, MentoMemory } from ".";

export function useMento<Args extends any[], Return>(mento: Mento<Args, Return>, ...args: Args) {
  const memoryRef = useRef(MentoMemory.create());
  return mento(memoryRef.current, ...args);
}

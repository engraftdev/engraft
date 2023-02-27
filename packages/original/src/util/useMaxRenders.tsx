import { useRef } from "react";

// Utility for cutting off infinite loops

export function useMaxRenders(max: number) {
  const renders = useRef(0);
  console.log("useMaxRenders", renders.current);
  if (renders.current++ > max) {
    throw new Error(`useMaxRenders: exceeded max renders (${max})`);
  }
}

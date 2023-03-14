
import { useCallback, useState } from "react";
import { Setter, Updater } from "./immutable.js";

// React's useState returns a setter that doesn't work for function types
//   (it interprets function arguments as updaters, not new function values)
// these fix that

export function useStateSetOnly<T>(init: () => T): [T, Setter<T>] {
  const [t, setT] = useState(init);

  const wrapped = useCallback((newT: T) => {
      setT(() => newT)
  }, [])

  return [t, wrapped];
}

export function useStateUpdateOnly<T>(init: () => T): [T, Updater<T>] {
  const [t, setT] = useState(init);

  return [t, setT];
}

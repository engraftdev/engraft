
import _ from "lodash";
import { useCallback, useMemo, useState } from "react";
import { at, atIndex, Setter, Updater, updaterToSetter } from "./immutable";

// React's useState returns a setter that doesn't work for function types
//   (it interprets function arguments as updaters, not new function values)
// these fix that

export function useStateSetOnly<T>(init: T): [T, Setter<T>] {
  const [t, setT] = useState(() => init);

  const wrapped = useCallback((newT: T) => {
      setT(() => newT)
  }, [])

  return [t, wrapped];
}

export function useStateUpdateOnly<T>(init: T): [T, Updater<T>] {
  const [t, setT] = useState(() => init);

  return [t, setT];
}

// and these are cool too

export function useUpdateAt<T, K extends string & keyof T>(update: Updater<T>, key: K): Updater<T[K]> {
  return useMemo(() => at(update, key), [update, key]);
}

export function useAt<T, K extends string & keyof T>(t: T, updateT: Updater<T>, key: K): [T[K], Updater<T[K]>, Setter<T[K]>] {
  const updateTK = useUpdateAt(updateT, key);
  const setTK = useMemo(() => updaterToSetter(updateTK), [updateTK]);
  return [t[key], updateTK, setTK];
}

export function useAts<T>(ts: {[key: string]: T}, updateTs: Updater<{[key: string]: T}>): {[key: string]: readonly [T, Updater<T>]} {
  return useMemo(() => {
    return _.mapValues(ts, (v, k) => [v, at(updateTs, k)] as const)
  }, [ts, updateTs]);
}

export function useSetter<T>(updateT: Updater<T>): Setter<T> {
  return useMemo(() => (newT: T) => updateT(() => newT), [updateT]);
}

export function useUpdateAtIndex<T>(update: Updater<T[]>, index: number): Updater<T> {
  return useMemo(() => atIndex(update, index), [update, index]);
}

export function useAtIndex<T>(ts: T[], updateTs: Updater<T[]>, index: number): [T, Updater<T>] {
  const updateT = useUpdateAtIndex(updateTs, index);
  return [ts[index], updateT];
}

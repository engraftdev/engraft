import { useCallback, useMemo, useState } from 'react';

export type Setter<T> = (newT: T) => void;
export type Updater<T> = (f: (oldT: T) => T) => void;

// React's useState returns a setter that doesn't work for function types
//   (it interprets function arguments as updaters, not new function values)
// this fixes that

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


// utils for working with updaters

// arguably this should just be `(oldT) => ({...oldT, ...newKeys})` part. this feels less abstract tho?
export function updateKeys<T>(update: Updater<T>, newKeys: Partial<T>) {
  update((oldT) => ({...oldT, ...newKeys}));
}

export function at<T, K extends string & keyof T>(update: Updater<T>, key: K): Updater<T[K]> {
  return (f: (oldTK: T[K]) => T[K]) => {
    update((oldT) => ({...oldT, [key]: f(oldT[key])}));
  };
}

export function useUpdateAt<T, K extends string & keyof T>(update: Updater<T>, key: K): Updater<T[K]> {
  return useMemo(() => at(update, key), [update, key]);
}

export function useAt<T, K extends string & keyof T>(t: T, updateT: Updater<T>, key: K): [T[K], Updater<T[K]>] {
  const updateTK = useUpdateAt(updateT, key);
  return [t[key], updateTK];
}

export function useSetter<T>(updateT: Updater<T>): Setter<T> {
  return useMemo(() => (newT: T) => updateT(() => newT), [updateT]);
}

export function atIndex<T>(update: Updater<T[]>, index: number): Updater<T> {
  return (f: (oldT: T) => T) => {
    update((oldTs) => {
      const newTs = oldTs.slice();
      newTs[index] = f(newTs[index]);
      return newTs;
    });
  };
}

export function useUpdateAtIndex<T>(update: Updater<T[]>, index: number): Updater<T> {
  return useMemo(() => atIndex(update, index), [update, index]);
}

export function useAtIndex<T>(ts: T[], updateTs: Updater<T[]>, index: number): [T, Updater<T>] {
  const updateT = useUpdateAtIndex(updateTs, index);
  return [ts[index], updateT];
}
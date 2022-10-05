import _ from 'lodash';
import { useCallback, useMemo, useState } from 'react';
import { updateF } from './updateF';


export type Replace<T, U> = Omit<T, keyof U> & U;

export type Setter<T> = (newT: T) => void;
export type Updater<T, U extends T = T> = (f: (oldU: U) => T) => void;

export function updaterToSetter<T, U extends T = T>(updater: Updater<T, U>): Setter<T> {
  return (newT) => updater(() => newT);
}

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
export function updateKeys<T, U extends T>(update: Updater<T, U>, newKeys: Partial<U>) {
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

export function atIndexZip<T>(ts: T[], updateTs: Updater<T[]>): [T, Updater<T>][] {
  return ts.map((t, i) => [t, atIndex(updateTs, i)]);
}

export function atIndices<T>(update: Updater<T[]>, length: number): Updater<T>[] {
  return Array.from({length}, (_, i) => atIndex(update, i));
}

export function atAllIndices<T>(update: Updater<T[]>): Updater<T> {
  return (f: (oldT: T) => T) => {
    update((oldTs) => oldTs.map(f));
  };
}

export function remover(updateArray: Updater<any[]>, index: number) {
  return () => {
    updateArray(updateF({$splice: [[index, 1]]}));
  };
}

export function removers(updateArray: Updater<any[]>, length: number) {
  return Array.from({length}, (_, i) => remover(updateArray, i));
}

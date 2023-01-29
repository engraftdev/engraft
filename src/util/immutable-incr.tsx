import { hookMemo } from "src/incr/hookMemo";
import { at, atIndex, Setter, Updater, updaterToSetter } from "./immutable";

export function hookUpdateAt<T, K extends string & keyof T>(update: Updater<T>, key: K): Updater<T[K]> {
  return hookMemo(() => at(update, key), [update, key]);
}

export function hookAt<T, K extends string & keyof T>(t: T, updateT: Updater<T>, key: K): [T[K], Updater<T[K]>, Setter<T[K]>] {
  const updateTK = hookUpdateAt(updateT, key);
  const setTK = hookMemo(() => updaterToSetter(updateTK), [updateTK]);
  return [t[key], updateTK, setTK];
}

export function hookUpdateAtIndex<T>(update: Updater<T[]>, index: number): Updater<T> {
  return hookMemo(() => atIndex(update, index), [update, index]);
}

export function hookAtIndex<T>(ts: T[], updateTs: Updater<T[]>, index: number): [T, Updater<T>] {
  const updateT = hookUpdateAtIndex(updateTs, index);
  return [ts[index], updateT];
}

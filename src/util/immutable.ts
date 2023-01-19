import { updateF } from './updateF';


// these utilities are for working with Setters and Updaters

export type Setter<T> = (newT: T) => void;
export type Updater<T, U extends T = T> = (f: (oldU: U) => T) => void;

export function updaterToSetter<T, U extends T = T>(updater: Updater<T, U>): Setter<T> {
  return (newT) => updater(() => newT);
}

// utils for working with updaters

export function at<T, K extends string & keyof T>(update: Updater<T>, key: K): Updater<T[K]> {
  return (f: (oldTK: T[K]) => T[K]) => {
    update((oldT) => ({...oldT, [key]: f(oldT[key])}));
  };
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

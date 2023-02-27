// these utilities are for working with Setters and Updaters

export type Setter<T> = (newT: T) => void;
export type Updater<T, U extends T = T> = (f: (oldU: U) => T) => void;
// use U for when you know the updater is coming from an even narrower type than the output

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

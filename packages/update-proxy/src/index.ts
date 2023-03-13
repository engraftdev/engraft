import immutabilityHelper, { Spec } from "immutability-helper";
import { Updater } from "@engraft/shared/lib/Updater";

export type KeyofWithoutArrayMethods<T> =
  T extends Array<any> ? keyof T & number : keyof T;

export type UpdateProxy<T> =
  // sub-UpdateProxies at keys
  & {
      [K in KeyofWithoutArrayMethods<T>]-?: Omit<T, K> extends T ? UpdateProxyRemovable<T[K]> : UpdateProxy<T[K]>
    }
  // general methods
  & {
      $: (f: (oldT: T) => T) => void,  // shorthand for $apply
      $apply: (f: (oldT: T) => T) => void,
      $set: (newT: T) => void,
      $helper: (spec: Spec<T>) => void,
      $as: <U>(u?: U) => UpdateProxy<U>,
    }
  // $all for arrays
  & (
      T extends (infer E)[]
      ? { $all: UpdateProxy<E> }
      : {}
    )
  // $all for objects
  & (
      T extends {[key: string]: infer E}
      ? { $all: UpdateProxy<E> }
      : {}
    );

export type UpdateProxyRemovable<T> = UpdateProxy<T> & {
  $remove: () => void;
}

export function updateProxy<T>(updater: Updater<T>): UpdateProxy<T>;
export function updateProxy<T>(updater: Updater<T>, remover: () => void): UpdateProxyRemovable<T>;
export function updateProxy<T>(updater: Updater<T>, remover?: () => void): UpdateProxy<T> {
  // Note: Although we want the interface of this function to be safely typed, it is impossible to
  // make its internals safely typed because of the weakness of Proxy's handler types (etc). So we
  // won't particularly try.

  const up: UpdateProxy<T> = new Proxy<UpdateProxy<T>>({
    $: updater,
    $apply: updater,
    $set: (newT) => updater(() => newT),
    $helper: (spec) => updater((oldT) => immutabilityHelper(oldT, spec)),
    $as: <U extends T>(u?: U) => up as unknown as UpdateProxy<U>,
    ...remover && {$remove: remover},
  } as UpdateProxy<T>, {
    get(target, key) {
      // Return cached properties
      if (key in target) {
        return target[key as keyof UpdateProxy<T>];
      }

      // Return special lazy properties
      if (key === '$all') {
        const propProxy = updateProxy(atAllObjOrArray(updater as any as Updater<T[]>));
        (target as any).$all = propProxy;
        return propProxy;
      }

      // Now we can assume `key` is a key of T and hasn't been cached
      const keyTyped = key as KeyofWithoutArrayMethods<T>;
      const propProxy = updateProxy(
        atObjOrArray(updater, keyTyped),
        // Fun fact: We always provide a remover, even if the property isn't removable.
        // (No way to tell the difference between essential & inessential properties at runtime!)
        // The typing of UpdateProxy itself stops the remover from being called on essential properties.
        removeFromObjOrArray(updater, keyTyped),
      );
      target[keyTyped] = propProxy as any;
      return propProxy;
    }
  });

  return up;
}

function atObjOrArray<T, K extends keyof T>(update: Updater<T>, key: K): Updater<T[K]> {
  return (f: (oldTK: T[K]) => T[K]) => {
    update((oldT: T) => {
      if (oldT instanceof Array) {
        const newTs = oldT.slice();
        newTs[key as number] = f(newTs[key as number]);
        return newTs as T;
      } else {
        return {...oldT, [key]: f(oldT[key])};
      }
    });
  };
}

// this (internal) function is not well typed; it should only be called when `Omit<T, K> extends T`.
function removeFromObjOrArray<T, K extends keyof T>(update: Updater<T>, key: K): () => void {
  return () => {
    update((oldT: T) => {
      if (oldT instanceof Array) {
        const newTs = oldT.slice();
        newTs.splice(key as number, 1);
        return newTs as T;
      } else {
        const newT = {...oldT};
        delete newT[key];
        return newT as T;
      }
    });
  };
}

// this (internal) function is not well typed.
type ObjOrArrayElement<T> = T extends (infer E)[] ? E : T extends {[key: string]: infer E} ? E : never;
function atAllObjOrArray<T>(update: Updater<T>): Updater<ObjOrArrayElement<T>> {
  return (f: (oldTElem: ObjOrArrayElement<T>) => ObjOrArrayElement<T>) => {
    update((oldT) => {
      if (oldT instanceof Array) {
        return oldT.map(f) as T;
      } else {
        const result: {[key: string]: ObjOrArrayElement<T>} = {};
        for (const key in oldT) {
          result[key] = f(oldT[key] as ObjOrArrayElement<T>);
        }
        return result as T;
      }
    });
  };
}

export function updateWithUP<T>(oldT: T, callback: (tUP: UpdateProxy<T>) => void): T {
  let newT = oldT;
  const tUP = updateProxy<T>((f) => newT = f(newT));
  callback(tUP);
  return newT;
}

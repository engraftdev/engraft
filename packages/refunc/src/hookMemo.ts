import { arrEqWithRefEq, Eq } from "@engraft/shared/lib/eq.js";
import { hookForkLater, HookTrail, hookRef, runWithTrail } from "./hooks.js";

// Produce a value with a function when a key changes according to a provided equality function.
// If an equality function is not provided, hookMemo acts like React.useMemo,
//   and the key should be an array which will be checked by reference equality on its elements.
// The function can be hooky.

export function hookMemo<Return>(f: () => Return, values: any[]): Return;
export function hookMemo<Key, Return>(f: () => Return, key: Key, eq: Eq<Key>): Return;
export function hookMemo<Key, Return>(f: () => Return, key: Key, eq?: Eq<Key>) {
  if (!eq) {
    // If there's no eq, values must be type any[], so this checks out.
    eq = arrEqWithRefEq as unknown as Eq<Key>;
  }

  const lastCallRef = hookRef<[Key, Return, HookTrail] | null>(() => null, 'hookMemo');

  if (lastCallRef.current === null || !eq(lastCallRef.current[0], key)) {
    let trail = lastCallRef.current?.[2];
    if (!trail) { trail = new HookTrail(); }
    const result = runWithTrail(f, trail);
    lastCallRef.current = [key, result, trail];
  }

  return lastCallRef.current[1];
}

export function hookDedupe<T>(value: T, eq: Eq<T>): T {
  return hookMemo(() => value, value, eq);
}

export type Cache<T> = {
  get: (key: string) => T,
  done: () => void,
}

// TODO: speculative new pattern
export function hookCache<T>(f: (key: string) => T): Cache<T> {
  const cache: Record<string, T> = {};
  const fork = hookForkLater();
  return {
    get: (key: string) => {
      if (!cache[key]) {
        cache[key] = fork.branch(key, () => f(key));
      }
      return cache[key];
    },
    done: () => {
      fork.done();
    },
  };
}

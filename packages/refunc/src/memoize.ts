import { arrEqWithRefEq, objEqWithRefEq } from "@engraft/shared/lib/eq.js";
import { Refunction, RefuncMemory } from "./refunc.js";
import { hookMemo } from "./hookMemo.js";
import { hookRefunction, hooks } from "./hooks.js";

// These functions perform single-item LRU caching, like React.memo.

// Memoize a refunction that takes any number of arguments,
// using reference equality on each argument.
export function memoize<Args extends unknown[], Return>(f: Refunction<Args, Return>): Refunction<Args, Return> {
  return hooks((...args: Args) => {
    return hookMemo(() => {
      return hookRefunction(f, ...args);
    }, args, arrEqWithRefEq);
  });
}

// Memoize a refunction that takes an object as its only argument,
// using reference equality on each property of the object.
export function memoizeProps<Props extends object, Return>(f: Refunction<[Props], Return>): Refunction<[Props], Return> {
  return hooks((props: Props) => {
    return hookMemo(() => {
      return hookRefunction(f, props);
    }, props, objEqWithRefEq);
  });
}

// This function performs perform forever-caching of a normal function, using an object key.
export function memoizeForever<Arg extends object, Return>(f: (obj: Arg) => Return): Refunction<[Arg], Return> {
  // Just for fun, let's implement this one without hooks.
  return (mem: RefuncMemory, obj: Arg) => {
    let cache: WeakMap<Arg, Return> | undefined = (mem as any).cache;
    if (!cache) {
      cache = (mem as any).cache = new WeakMap();
    }

    let result = cache.get(obj);
    if (!result) {
      result = f(obj);
      cache.set(obj, result);
    }
    return result;
  }
}

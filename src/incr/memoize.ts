import { arrEqWithRefEq, objEqWithRefEq } from "src/util/eq";
import { IncrFunction, IncrMemory } from ".";
import { hookMemo } from "./hookMemo";
import { hookIncr, hooks } from "./hooks";

// These functions perform single-item LRU caching, like React.memo.

// Memoize an incr that takes any number of arguments,
// using reference equality on each argument.
export function memoize<Args extends unknown[], Return>(f: IncrFunction<Args, Return>): IncrFunction<Args, Return> {
  return hooks((...args: Args) => {
    return hookMemo(() => {
      return hookIncr(f, ...args);
    }, args, arrEqWithRefEq);
  });
}

// Memoize an incr that takes an object as its only argument,
// using reference equality on each property of the object.
export function memoizeProps<Props extends object, Return>(f: IncrFunction<[Props], Return>): IncrFunction<[Props], Return> {
  return hooks((props: Props) => {
    return hookMemo(() => {
      return hookIncr(f, props);
    }, props, objEqWithRefEq);
  });
}

// This function performs perform forever-caching of a normal function, using an object key.
export function memoizeForever<Arg extends object, Return>(f: (obj: Arg) => Return): IncrFunction<[Arg], Return> {
  // Just for fun, let's implement this one without hooks.
  return (mem: IncrMemory, obj: Arg) => {
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

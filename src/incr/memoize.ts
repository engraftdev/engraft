import { arrEqWithRefEq, objEqWithRefEq } from "src/util/eq";
import { Incr } from ".";
import { hookMemo } from "./hookMemo";
import { hookIncr, hooks } from "./hooks";

// These functions perform single-item LRU caching, like React.memo.

// Memoize an incr that takes any number of arguments,
// using reference equality on each argument.
export function memoize<Args extends unknown[], Return>(f: Incr<Args, Return>): Incr<Args, Return> {
  return hooks((...args: Args) => {
    return hookMemo(() => {
      return hookIncr(f, ...args);
    }, args, arrEqWithRefEq);
  });
}

// Memoize an incr that takes an object as its only argument,
// using reference equality on each property of the object.
export function memoizeProps<Props extends object, Return>(f: Incr<[Props], Return>): Incr<[Props], Return> {
  return hooks((props: Props) => {
    return hookMemo(() => {
      return hookIncr(f, props);
    }, props, objEqWithRefEq);
  });
}

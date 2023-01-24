import { arrEqWithRefEq, objEqWithRefEq } from "src/util/eq";
import { Mento } from ".";
import { hookMemo } from "./hookMemo";
import { hookMento, hooks } from "./hooks";

// These functions perform single-item LRU caching, like React.memo.

// Memoize a Mento that takes any number of arguments,
// using reference equality on each argument.
export function memoize<Args extends unknown[], Return>(f: Mento<Args, Return>): Mento<Args, Return> {
  return hooks((...args: Args) => {
    return hookMemo(() => {
      return hookMento(f, ...args);
    }, args, arrEqWithRefEq);
  });
}

// Memoize a Mento that takes an object as its only argument,
// using reference equality on each property of the object.
export function memoizeProps<Props extends object, Return>(f: Mento<[Props], Return>): Mento<[Props], Return> {
  return hooks((props: Props) => {
    return hookMemo(() => {
      return hookMento(f, props);
    }, props, objEqWithRefEq);
  });
}

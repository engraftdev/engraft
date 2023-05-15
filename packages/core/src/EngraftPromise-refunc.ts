import { hookLater } from "@engraft/refunc";
import { EngraftPromise } from "./EngraftPromise.js";

// Convenience function for running hooks asynchronously.
// Memoizes nothing.
export function hookThen<T, U>(promise: EngraftPromise<T>, onfulfilled: (value: T) => (U | PromiseLike<U>)): EngraftPromise<U> {
  const later = hookLater();
  return promise.then((value) =>
    later(() =>
      onfulfilled(value)
    )
  );
};

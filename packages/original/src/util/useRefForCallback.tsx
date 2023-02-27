import { MutableRefObject, useRef } from "react";

// So you want to define a ref that's always kept in sync with a certain value.
// You wanna do this so that a callback can use the up-to-date value, without
// having to be redefined when the value changes.

// Here's useRefForCallback!

export function useRefForCallback<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

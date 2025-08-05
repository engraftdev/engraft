import { compare } from "@engraft/shared/lib/compare.js";
import { hookRef } from "./hooks.js";

// Not especially pure; probably shouldn't be used outside of debug contexts?
export function hookPrevious <T>(value: T, init: () => T): T {
  const ref = hookRef(init);
  const current = ref.current;
  ref.current = value;
  return current;
};

// Utility for debugging what might be causing a memoized refunc to re-run.
// Just call:
//   hookLogChanges({someVar, someOtherVar, ...})
export function hookLogChanges(values: any, label?: string) {
  const prevValues = hookPrevious(values, () => null);
  if (!prevValues) { return; }
  for (const key in values) {
    if (values[key] !== prevValues[key]) {
      console.groupCollapsed(`${label ? `(${label}) ` : ''}${key}: ${prevValues[key]} → ${values[key]}`);
      try {
        console.log(compare(prevValues[key], values[key]));
      } finally {
        console.groupEnd();
      }
    }
  }
}

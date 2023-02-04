import _ from "lodash";
import { hookRef } from "./hooks";

// Not especially pure; probably shouldn't be used outside of debug contexts?
export function hookPrevious <T>(value: T, init: () => T): T {
  const ref = hookRef(init);
  const current = ref.current;
  ref.current = value;
  return current;
};

// Utility for debugging what might be causing a memoized mento to re-run.
// Just call:
//   hookLogChanges({someVar, someOtherVar, ...})
export function hookLogChanges(values: any, label?: string) {
  const prevValues = hookPrevious(values, () => null);
  if (!prevValues) { return; }
  for (const key in values) {
    if (values[key] !== prevValues[key]) {
      console.log(`${label ? `(${label}) ` : ''}${key}: ${prevValues[key]} → ${values[key]}`);
      console.log(comparison(prevValues[key], values[key]));
    }
  }
}

function comparison(a: any, b: any): any {
  return JSON.stringify(comparisonObj(a, b), null, 2);
}

function comparisonObj(a: any, b: any, topLevel = true): any {
  if (topLevel && !_.isEqual(a, b)) { return '[not deep-equal]'; }

  // ok so now we know they're deep-equal...
  // are they ref-equal?

  if (a === b) { return '[ref-equal]'; }

  // ok so they're deep-equal but not ref-equal
  // they must either be both arrays or both objects

  if (Array.isArray(a)) {
    return a.map((a, i) => comparisonObj(a, b[i], false));
  }

  const result: any = {};
  for (const key in a) {
    result[key] = comparisonObj(a[key], b[key], false);
  }
  return result;
}

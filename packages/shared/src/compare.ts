import IsEqual from "lodash-es/isEqual.js";
import { diff } from "deep-object-diff";

const isEqual = IsEqual.default;

export function compare(a: any, b: any): string {
  if (isEqual(a, b)) {
    return "[not deep-equal]: " + JSON.stringify(diff(a, b), null, 2);
  } else {
    return "[deep-equal]: " + JSON.stringify(compareDeepEqualObjectsForReferenceEquality(a, b), null, 2);
  }
}

// this crude-but-helpful li'l guy shows you how deep you need to go to get reference equality.
function compareDeepEqualObjectsForReferenceEquality(a: any, b: any): any {
  // we know they're deep-equal...
  // are they ref-equal?

  if (a === b) { return '[ref-equal]'; }

  // ok so they're deep-equal but not ref-equal
  // they must either be both arrays or both objects

  if (Array.isArray(a)) {
    return a.map((a, i) => compareDeepEqualObjectsForReferenceEquality(a, b[i]));
  } else {
    const result: any = {};
    for (const key in a) {
      result[key] = compareDeepEqualObjectsForReferenceEquality(a[key], b[key]);
    }
    return result;
  }
}

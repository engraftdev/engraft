import { describe, expect, it } from "vitest";
import { objEqWithRefEq } from "../lib/eq.js";

describe('objEqWithRefEq', () => {
  it('is not dumb about undefined', () => {
    // embarrassed to report this is here for a good reason
    expect(objEqWithRefEq({a: undefined}, {b: undefined})).toBe(false);
  });
});

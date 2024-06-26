import { describe, expect, it } from "vitest";
import { refEq } from "@engraft/shared/lib/eq.js";
import { RefuncMemory } from "../lib/refunc.js";
import { hookMemo } from "../lib/hookMemo.js";
import { hooks } from "../lib/hooks.js";

describe('hookMemo without equality function', () => {
  let minusRuns = 0;
  const minus = hooks((x: number, y: number) => {
    return hookMemo(() => {
      minusRuns++;
      return x - y;
    }, [x, y]);
  });

  it('does not re-run when arguments stay the same', () => {
    minusRuns = 0;
    const memory = new RefuncMemory();
    expect(minus(memory, 10, 5)).toBe(5);
    expect(minusRuns).toBe(1);
    expect(minus(memory, 10, 5)).toBe(5);
    expect(minusRuns).toBe(1);
  });

  it('does re-run when arguments change', () => {
    minusRuns = 0;
    const memory = new RefuncMemory();
    expect(minus(memory, 10, 5)).toBe(5);
    expect(minusRuns).toBe(1);
    expect(minus(memory, 10, 6)).toBe(4);
    expect(minusRuns).toBe(2);
  });
});

describe('hookMemo with equality function', () => {
  let minusRuns = 0;
  const minus = hooks((props: {x: number, y: number}) => {
    return hookMemo(() => {
      minusRuns++;
      return props.x - props.y;
    }, props, refEq);  // notice that we perversely use refEq here
  });

  it('does not re-run when arguments stay the same', () => {
    minusRuns = 0;
    const memory = new RefuncMemory();
    const props = {x: 10, y: 5}
    expect(minus(memory, props)).toBe(5);
    expect(minusRuns).toBe(1);
    expect(minus(memory, props)).toBe(5);
    expect(minusRuns).toBe(1);
  });

  it('does re-run when arguments change', () => {
    minusRuns = 0;
    const memory = new RefuncMemory();
    expect(minus(memory, {x: 10, y: 5})).toBe(5);
    expect(minusRuns).toBe(1);
    expect(minus(memory, {x: 10, y: 5})).toBe(5);
    expect(minusRuns).toBe(2);
  });
});

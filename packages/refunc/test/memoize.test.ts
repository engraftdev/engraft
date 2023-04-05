import { describe, expect, it } from "vitest";
import { Refunction, RefuncMemory } from "../lib/refunc.js";
import { memoize, memoizeForever, memoizeProps } from "../lib/memoize.js";

describe('memoize', () => {
  let minusRuns = 0;
  const minus = memoize(Refunction.fromFunction((x: number, y: number) => {
    minusRuns++;
    return x - y;
  }));

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

describe('memoizeProps', () => {
  let minusRuns = 0;
  const minus = memoizeProps(Refunction.fromFunction(({x, y}: {x: number, y: number}) => {
    minusRuns++;
    return x - y;
  }));

  it('does not re-run when props stay the same', () => {
    minusRuns = 0;
    const memory = new RefuncMemory();
    expect(minus(memory, {x: 10, y: 5})).toBe(5);
    expect(minusRuns).toBe(1);
    expect(minus(memory, {x: 10, y: 5})).toBe(5);
    expect(minusRuns).toBe(1);
  });

  it('does re-run when props change', () => {
    minusRuns = 0;
    const memory = new RefuncMemory();
    expect(minus(memory, {x: 10, y: 5})).toBe(5);
    expect(minusRuns).toBe(1);
    expect(minus(memory, {x: 10, y: 6})).toBe(4);
    expect(minusRuns).toBe(2);
  });
});

describe('memoizeForever', () => {
  it('basically works', () => {
    let runs = 0;
    const square = memoizeForever((o: {a: number}) => {
      runs++;
      return o.a ** 2;
    });

    const obj1 = {a: 1};
    const obj2 = {a: 2};

    const memory = new RefuncMemory();
    expect(square(memory, obj1)).toEqual(1);
    expect(runs).toBe(1);
    expect(square(memory, obj2)).toEqual(4);
    expect(runs).toBe(2);
    expect(square(memory, obj1)).toEqual(1);
    expect(runs).toBe(2);
  });
});

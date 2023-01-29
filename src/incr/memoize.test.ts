import { describe, expect, it } from '@jest/globals';
import { Incr } from '.';
import { memoize, memoizeProps } from './memoize';

describe('memoize', () => {
  let minusRuns = 0;
  const minus = memoize(Incr.fromFunction((x: number, y: number) => {
    minusRuns++;
    return x - y;
  }));

  it('does not re-run when arguments stay the same', () => {
    minusRuns = 0;
    const memory = Incr.createMemory();
    expect(minus(memory, 10, 5)).toBe(5);
    expect(minusRuns).toBe(1);
    expect(minus(memory, 10, 5)).toBe(5);
    expect(minusRuns).toBe(1);
  });

  it('does re-run when arguments change', () => {
    minusRuns = 0;
    const memory = Incr.createMemory();
    expect(minus(memory, 10, 5)).toBe(5);
    expect(minusRuns).toBe(1);
    expect(minus(memory, 10, 6)).toBe(4);
    expect(minusRuns).toBe(2);
  });
});

describe('memoizeProps', () => {
  let minusRuns = 0;
  const minus = memoizeProps(Incr.fromFunction(({x, y}: {x: number, y: number}) => {
    minusRuns++;
    return x - y;
  }));

  it('does not re-run when props stay the same', () => {
    minusRuns = 0;
    const memory = Incr.createMemory();
    expect(minus(memory, {x: 10, y: 5})).toBe(5);
    expect(minusRuns).toBe(1);
    expect(minus(memory, {x: 10, y: 5})).toBe(5);
    expect(minusRuns).toBe(1);
  });

  it('does re-run when props change', () => {
    minusRuns = 0;
    const memory = Incr.createMemory();
    expect(minus(memory, {x: 10, y: 5})).toBe(5);
    expect(minusRuns).toBe(1);
    expect(minus(memory, {x: 10, y: 6})).toBe(4);
    expect(minusRuns).toBe(2);
  });
});

import _ from 'lodash';
import { describe, expect, it } from 'vitest';
import { hookFork, hookIncr, hookRef, hooks } from '../lib/hooks';
import { IncrMemory } from '../lib/incr';

let squareRuns = 0;
const square = hooks((x: number) => {
  // Note that you will (almost?) never use hookRef in practice;
  // this is intentionally testing a low-level building block.

  let ref = hookRef<[number, number] | null>(() => null);
  if (ref.current === null || ref.current[0] !== x) {
    ref.current = [x, x * x];
    squareRuns++;
  }
  return ref.current[1];
});

describe('hookRef', () => {
  it('single hookRef works (square)', () => {
    squareRuns = 0;
    const memory = new IncrMemory();
    expect(square(memory, 10)).toEqual(100);
    expect(squareRuns).toEqual(1);
    expect(square(memory, 10)).toEqual(100);
    expect(squareRuns).toEqual(1);
    expect(square(memory, 11)).toEqual(121);
    expect(squareRuns).toEqual(2);
    expect(square(memory, 11)).toEqual(121);
    expect(squareRuns).toEqual(2);
  });
});

describe('hookFork', () => {
  const squareEach = hooks((obj: { [key: string]: number }) => {
    const result: { [key: string]: number } = {};
    hookFork(branch => {
      for (const key in obj) {
        branch(key, () => {
          result[key] = hookIncr(square, obj[key]);
        });
      }
    });
    return result;
  });

  it('basically works', () => {
    squareRuns = 0;
    const memory = new IncrMemory();
    expect(squareEach(memory, {x: 1, y: 2})).toEqual({x: 1, y: 4});
    expect(squareRuns).toEqual(2);
    expect(squareEach(memory, {x: 1, y: 2})).toEqual({x: 1, y: 4});
    expect(squareRuns).toEqual(2);
    expect(squareEach(memory, {x: 1, y: 3})).toEqual({x: 1, y: 9});
    expect(squareRuns).toEqual(3);
  });

  it('cleans up appropriately (check 1)', () => {
    squareRuns = 0;
    const memory = new IncrMemory();
    expect(squareEach(memory, {x: 1, y: 2})).toEqual({x: 1, y: 4});
    expect(squareRuns).toEqual(2);
    expect(squareEach(memory, {x: 1})).toEqual({x: 1});
    expect(squareRuns).toEqual(2);
    expect(squareEach(memory, {x: 1, y: 2})).toEqual({x: 1, y: 4});
    expect(squareRuns).toEqual(3);
  });

  it('cleans up appropriately (check 2)', () => {
    squareRuns = 0;
    const memory = new IncrMemory();
    expect(squareEach(memory, {x: 1})).toEqual({x: 1});
    expect(squareRuns).toEqual(1);
    const memoryAfterJustX = _.cloneDeep(memory);
    expect(squareEach(memory, {x: 1, y: 2})).toEqual({x: 1, y: 4});
    expect(squareRuns).toEqual(2);
    expect(memory).not.toEqual(memoryAfterJustX);
    expect(squareEach(memory, {x: 1})).toEqual({x: 1});
    expect(squareRuns).toEqual(2);
    expect(memory).toEqual(memoryAfterJustX);
  });
});

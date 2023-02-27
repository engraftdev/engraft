import { describe, it } from 'vitest';
import _ from 'lodash';
import { expectToEqual, expectToNotEqual } from 'src/util/expectToEqual';
import { IncrMemory } from '.';
import { hookFork, hookIncr, hookRef, hooks } from './hooks';

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
    expectToEqual(square(memory, 10), 100);
    expectToEqual(squareRuns, 1);
    expectToEqual(square(memory, 10), 100);
    expectToEqual(squareRuns, 1);
    expectToEqual(square(memory, 11), 121);
    expectToEqual(squareRuns, 2);
    expectToEqual(square(memory, 11), 121);
    expectToEqual(squareRuns, 2);
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
    expectToEqual(squareEach(memory, {x: 1, y: 2}), {x: 1, y: 4});
    expectToEqual(squareRuns, 2);
    expectToEqual(squareEach(memory, {x: 1, y: 2}), {x: 1, y: 4});
    expectToEqual(squareRuns, 2);
    expectToEqual(squareEach(memory, {x: 1, y: 3}), {x: 1, y: 9});
    expectToEqual(squareRuns, 3);
  });

  it('cleans up appropriately (check 1)', () => {
    squareRuns = 0;
    const memory = new IncrMemory();
    expectToEqual(squareEach(memory, {x: 1, y: 2}), {x: 1, y: 4});
    expectToEqual(squareRuns, 2);
    expectToEqual(squareEach(memory, {x: 1}), {x: 1});
    expectToEqual(squareRuns, 2);
    expectToEqual(squareEach(memory, {x: 1, y: 2}), {x: 1, y: 4});
    expectToEqual(squareRuns, 3);
  });

  it('cleans up appropriately (check 2)', () => {
    squareRuns = 0;
    const memory = new IncrMemory();
    expectToEqual(squareEach(memory, {x: 1}), {x: 1});
    expectToEqual(squareRuns, 1);
    const memoryAfterJustX = _.cloneDeep(memory);
    expectToEqual(squareEach(memory, {x: 1, y: 2}), {x: 1, y: 4});
    expectToEqual(squareRuns, 2);
    expectToNotEqual(memory, memoryAfterJustX);
    expectToEqual(squareEach(memory, {x: 1}), {x: 1});
    expectToEqual(squareRuns, 2);
    expectToEqual(memory, memoryAfterJustX);
  });
});

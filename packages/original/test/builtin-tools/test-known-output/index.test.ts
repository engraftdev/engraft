import { EngraftPromise, toolFromModule } from '@engraft/core';
import { IncrMemory } from '@engraft/incr';
import { expectToEqual } from '@engraft/test-shared/src/expectToEqual';
import { describe, it } from 'vitest';
import * as testValue from '../../../src/builtin-tools/test-known-output';
import { empty } from '../../../src/util/noOp';

// @vitest-environment happy-dom

const testValueTool = toolFromModule(testValue);

describe('test-known-output', () => {
  it('output basically works', () => {
    const memory = new IncrMemory();
    [1, 2, 3].forEach((value) => {
      const {outputP} = testValueTool.run(memory, {
        program: {
          toolName: 'test-known-output',
          outputP: EngraftPromise.resolve({value}),
        },
        varBindings: {},
      });
      expectToEqual(EngraftPromise.state(outputP), {status: 'fulfilled', value: {value}});
    });
  });

  it('onRun basically works', () => {
    const memory = new IncrMemory();

    let runs = 0;
    let program: testValue.Program = {
      toolName: 'test-known-output',
      outputP: EngraftPromise.resolve({value: 1}),
      onRun: () => { runs++ },
    };
    function runProgram() {
      return EngraftPromise.state(
        testValueTool.run(memory, {
          program,
          varBindings: empty,
        }).outputP
      );
    }

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 1}});
    expectToEqual(runs, 1);

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 1}});
    expectToEqual(runs, 1);

    program = {...program, outputP: EngraftPromise.resolve({value: 2})};

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 2}});
    expectToEqual(runs, 2);
  });
});

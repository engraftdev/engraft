import { describe, it } from '@jest/globals';
import { EngraftPromise } from 'src/engraft/EngraftPromise';
import { MentoMemory } from 'src/mento';
import { expectToEqual } from 'src/util/expectToEqual';
import { empty, noOp } from 'src/util/noOp';
import { Program, tool } from './test-value';

describe('test-value', () => {
  it('output basically works', () => {
    const memory = MentoMemory.create();
    [1, 2, 3].forEach((value) => {
      const {outputP} = tool.run(memory, {
        program: {
          toolName: 'test-value',
          value,
        },
        varBindings: {},
        updateProgram: noOp,
      });
      expectToEqual(EngraftPromise.state(outputP), {status: 'fulfilled', value: {value}});
    });
  });

  it('onRun basically works', () => {
    const memory = MentoMemory.create();

    let runs = 0;
    let program: Program = {
      toolName: 'test-value',
      value: 1,
      onRun: () => { runs++ },
    };
    function runProgram() {
      return EngraftPromise.state(
        tool.run(memory, {
          program,
          varBindings: empty,
          updateProgram: noOp,
        }).outputP
      );
    }

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 1}});
    expectToEqual(runs, 1);

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 1}});
    expectToEqual(runs, 1);

    program = {...program, value: 2};

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 2}});
    expectToEqual(runs, 2);
  });
});

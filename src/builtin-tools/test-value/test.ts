import { describe, it } from '@jest/globals';
import { EngraftPromise } from 'src/engraft/EngraftPromise';
import { MentoMemory } from 'src/mento';
import { toolFromModule } from 'src/toolFromModule';
import { expectToEqual } from 'src/util/expectToEqual';
import { empty, noOp } from 'src/util/noOp';
import * as testValue from '.';

const testValueTool = toolFromModule(testValue);

describe('test-value', () => {
  it('output basically works', () => {
    const memory = MentoMemory.create();
    [1, 2, 3].forEach((value) => {
      const {outputP} = testValueTool.run(memory, {
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
    let program: testValue.Program = {
      toolName: 'test-value',
      value: 1,
      onRun: () => { runs++ },
    };
    function runProgram() {
      return EngraftPromise.state(
        testValueTool.run(memory, {
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

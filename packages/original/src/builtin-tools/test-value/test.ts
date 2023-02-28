import { describe, it } from 'vitest';
import { EngraftPromise } from '../../engraft/EngraftPromise';
import { toolFromModule } from '../../engraft/toolFromModule';
import { expectToEqual } from '@engraft/test-shared/src/expectToEqual';
import { empty } from '../../util/noOp';
import * as testValue from '.';
import { IncrMemory } from '@engraft/incr';

const testValueTool = toolFromModule(testValue);

describe('test-value', () => {
  it('output basically works', () => {
    const memory = new IncrMemory();
    [1, 2, 3].forEach((value) => {
      const {outputP} = testValueTool.run(memory, {
        program: {
          toolName: 'test-value',
          value,
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
      toolName: 'test-value',
      value: 1,
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

    program = {...program, value: 2};

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 2}});
    expectToEqual(runs, 2);
  });
});

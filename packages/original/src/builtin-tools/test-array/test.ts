import { EngraftPromise, registerTool, toolFromModule } from '@engraft/core';
import { IncrMemory } from '@engraft/incr';
import { expectToEqual } from '@engraft/test-shared/src/expectToEqual';
import update from 'immutability-helper';
import { describe, it } from 'vitest';
import { empty } from '../../util/noOp';
import * as testValue from '../test-value';
import * as testArray from './index';

// @vitest-environment happy-dom

const testArrayTool = toolFromModule(testArray);
registerTool(toolFromModule(testValue));

describe('test-array', () => {
  it('output basically works; no unnecessary runs of subtools', () => {
    const memory = new IncrMemory();

    let subTool1Runs = 0;
    let subTool2Runs = 0;
    let program: testArray.Program = {
      toolName: 'test-array',
      subToolPrograms: [
        {
          toolName: 'test-value',
          value: 1,
          onRun: () => { subTool1Runs++ },
        },
        {
          toolName: 'test-value',
          value: 2,
          onRun: () => { subTool2Runs++ },
        },
      ],
    };
    function runProgram() {
      return EngraftPromise.state(
        testArrayTool.run(memory, {
          program,
          varBindings: empty,
        }).outputP
      );
    }

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: [1, 2]}});
    expectToEqual(subTool1Runs, 1);
    expectToEqual(subTool2Runs, 1);

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: [1, 2]}});
    expectToEqual(subTool1Runs, 1);
    expectToEqual(subTool2Runs, 1);

    program = update(program, {subToolPrograms: {0: {value: {$set: 3}}}});

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: [3, 2]}});
    expectToEqual(subTool1Runs, 2);
    expectToEqual(subTool2Runs, 1);
  });
});

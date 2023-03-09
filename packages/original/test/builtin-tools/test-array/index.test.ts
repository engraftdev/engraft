import { EngraftPromise, registerTool, toolFromModule } from '@engraft/core';
import { IncrMemory } from '@engraft/incr';
import update from 'immutability-helper';
import { describe, expect, it } from 'vitest';
import { empty } from '../../../src/util/noOp';
import * as TestKnownOutput from '../../../src/builtin-tools/test-known-output';
import * as TestArray from '../../../src/builtin-tools/test-array/index';

// @vitest-environment happy-dom

const testArrayTool = toolFromModule(TestArray);
registerTool(toolFromModule(TestKnownOutput));

describe('test-array', () => {
  it('output basically works; no unnecessary runs of subtools', () => {
    const memory = new IncrMemory();

    let subTool1Runs = 0;
    let subTool2Runs = 0;
    let program: TestArray.Program = {
      toolName: 'test-array',
      subToolPrograms: [
        {
          toolName: 'test-known-output',
          outputP: EngraftPromise.resolve({value: 1}),
          onRun: () => { subTool1Runs++ },
        },
        {
          toolName: 'test-known-output',
          outputP: EngraftPromise.resolve({value: 2}),
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

    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: [1, 2]}});
    expect(subTool1Runs).toEqual(1);
    expect(subTool2Runs).toEqual(1);

    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: [1, 2]}});
    expect(subTool1Runs).toEqual(1);
    expect(subTool2Runs).toEqual(1);

    program = update(program, {subToolPrograms: {0: {outputP: {$set: EngraftPromise.resolve({value: 3})}}}});

    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: [3, 2]}});
    expect(subTool1Runs).toEqual(2);
    expect(subTool2Runs).toEqual(1);
  });
});

import { EngraftPromise, toolFromModule } from '@engraft/core';
import { IncrMemory } from '@engraft/incr';
import { describe, expect, it } from 'vitest';
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
      expect(EngraftPromise.state(outputP)).toEqual({status: 'fulfilled', value: {value}});
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

    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: 1}});
    expect(runs).toEqual(1);

    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: 1}});
    expect(runs).toEqual(1);

    program = {...program, outputP: EngraftPromise.resolve({value: 2})};

    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: 2}});
    expect(runs).toEqual(2);
  });
});

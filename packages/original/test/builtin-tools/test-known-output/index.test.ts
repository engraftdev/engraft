import { EngraftPromise, toolFromModule } from "@engraft/core";
import { RefuncMemory } from "@engraft/refunc";
import { describe, expect, it } from "vitest";
import * as testKnownOutput from "../../../lib/builtin-tools/test-known-output/index.js";
import { empty } from "../../../lib/util/noOp.js";

// @vitest-environment happy-dom

const testKnownOutputTool = toolFromModule(testKnownOutput);

describe('test-known-output', () => {
  it('output basically works', () => {
    const memory = new RefuncMemory();
    [1, 2, 3].forEach((value) => {
      const {outputP} = testKnownOutputTool.run(memory, {
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
    const memory = new RefuncMemory();

    let runs = 0;
    let program: testKnownOutput.Program = {
      toolName: 'test-known-output',
      outputP: EngraftPromise.resolve({value: 1}),
      onRun: () => { runs++ },
    };
    function runProgram() {
      return EngraftPromise.state(
        testKnownOutputTool.run(memory, {
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

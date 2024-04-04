import { EngraftPromise } from "@engraft/core";
import { RefuncMemory } from "@engraft/refunc";
import { empty } from "@engraft/shared/lib/noOp.js";
import { describe, expect, it } from "vitest";
import * as TestingKnownOutput from "../lib/testing-known-output.js";

// @vitest-environment happy-dom

describe('testing-known-output', () => {
  it('output basically works', () => {
    const memory = new RefuncMemory();
    [1, 2, 3].forEach((value) => {
      const {outputP} = TestingKnownOutput.tool.run(memory, {
        program: {
          toolName: 'testing-known-output',
          outputP: EngraftPromise.resolve({value}),
        },
        varBindings: {},
        context: undefined as any,  // not used here
      });
      expect(EngraftPromise.state(outputP)).toEqual({status: 'fulfilled', value: {value}});
    });
  });

  it('onRun basically works', () => {
    const memory = new RefuncMemory();

    let runs = 0;
    let program: TestingKnownOutput.Program = {
      toolName: 'testing-known-output',
      outputP: EngraftPromise.resolve({value: 1}),
      onRun: () => { runs++ },
    };
    function runProgram() {
      return EngraftPromise.state(
        TestingKnownOutput.tool.run(memory, {
          program,
          varBindings: empty,
          context: undefined as any,  // not used here
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

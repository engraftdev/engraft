import { EngraftPromise, toolFromModule } from "@engraft/core";
import { RefuncMemory } from "@engraft/refunc";
import { empty } from "@engraft/shared/lib/noOp.js";
import { TestingKnownOutput, registerTestingComponents } from "@engraft/testing-components";
import { updateWithUP } from "@engraft/update-proxy";
import { describe, expect, it } from "vitest";
import * as TestArray from "../../lib/test-array/index.js";

// @vitest-environment happy-dom

const testArrayTool = toolFromModule(TestArray);
registerTestingComponents();

describe('test-array', () => {
  it('output basically works; no unnecessary runs of subtools', () => {
    const memory = new RefuncMemory();

    let subTool1Runs = 0;
    let subTool2Runs = 0;
    let program: TestArray.Program = {
      toolName: 'test-array',
      subToolPrograms: [
        {
          toolName: 'testing-known-output',
          outputP: EngraftPromise.resolve({value: 1}),
          onRun: () => { subTool1Runs++ },
        } satisfies TestingKnownOutput.Program,
        {
          toolName: 'testing-known-output',
          outputP: EngraftPromise.resolve({value: 2}),
          onRun: () => { subTool2Runs++ },
        } satisfies TestingKnownOutput.Program,
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

    program = updateWithUP(program, (up) => up.subToolPrograms[0].outputP.$set(EngraftPromise.resolve({value: 3})));

    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: [3, 2]}});
    expect(subTool1Runs).toEqual(2);
    expect(subTool2Runs).toEqual(1);
  });
});
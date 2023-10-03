import { empty } from "@engraft/shared/lib/noOp.js";
import Slot from "@engraft/tool-slot";
import { EngraftPromise, ToolOutput, dispatcher, newVar, registerTool, slotWithCode, toolFromModule } from "@engraft/toolkit";
import { describe, expect, it } from "vitest";
import { Closure, closureToAsyncFunction, closureToSyncFunction } from "../lib/closure.js";
import { registerTestingComponents, TestingKnownOutput } from "@engraft/testing-components";

// @vitest-environment happy-dom

registerTestingComponents();
dispatcher().registerTool(toolFromModule(Slot));

describe('closureToSyncFunction', () => {
  it('basically works', () => {
    const input1 = newVar('input 1');
    const input2 = newVar('input 2');

    const closure: Closure = {
      vars: [ input1, input2 ],
      bodyProgram: slotWithCode(`10 * ${input1.id} + ${input2.id}`),
      closureVarBindings: empty,
    }

    const func = closureToSyncFunction(closure);

    expect(func(1, 2)).toEqual(12);

    // not enough arguments
    expect(() => func(1)).toThrow();
  });

  it('works with closed-over variables', () => {
    const input1 = newVar('input 1');
    const input2 = newVar('input 2');

    const closure: Closure = {
      vars: [ input1 ],
      bodyProgram: slotWithCode(`10 * ${input1.id} + ${input2.id}`),
      closureVarBindings: {
        [input2.id]: {
          var_: input2,
          outputP: EngraftPromise.resolve({value: 2}),
        },
      },
    }

    const func = closureToSyncFunction(closure);

    expect(func(1)).toEqual(12);
  });

  it('throws if output is pending', () => {
    const bodyOutputP = EngraftPromise.unresolved<ToolOutput>();

    const closure: Closure = {
      vars: [ ],
      bodyProgram: {
        toolName: 'testing-known-output',
        outputP: bodyOutputP,
      } satisfies TestingKnownOutput.Program,
      closureVarBindings: empty,
    }

    const func = closureToSyncFunction(closure);

    expect(() => func()).toThrow();
  });
});

describe('closureToAsyncFunction', () => {
  function delayByMs<T>(value: T, delayMs: number): EngraftPromise<T> {
    return new EngraftPromise((resolve) => {
      setTimeout(() => {
        resolve(value);
      }, delayMs)
    });
  }

  it('basically works', async () => {
    const bodyOutputP = EngraftPromise.unresolved<ToolOutput>();

    const closure: Closure = {
      vars: [ ],
      bodyProgram: {
        toolName: 'testing-known-output',
        outputP: bodyOutputP,
      } satisfies TestingKnownOutput.Program,
      closureVarBindings: empty,
    }

    const func = closureToAsyncFunction(closure);

    // set up a delayed resolution
    delayByMs(undefined, 10).then(() => {
      bodyOutputP.resolve({value: 12});
    })

    expect(await func()).toEqual(12);
  });
});

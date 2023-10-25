import { empty } from "@engraft/shared/lib/noOp.js";
import { TestingKnownOutput, TestingRefsFunc, makeTestingContext } from "@engraft/testing-components";
import Slot from "@engraft/tool-slot";
import { EngraftPromise, ToolOutput, newVar, toolFromModule } from "@engraft/toolkit";
import { describe, expect, it } from "vitest";
import { Closure, closureToAsyncFunction, closureToSyncFunction } from "../lib/closure.js";

// @vitest-environment happy-dom

const context = makeTestingContext();
context.dispatcher.registerTool(toolFromModule(Slot));

describe('closureToSyncFunction', () => {
  const input1 = newVar('input 1');
  const input2 = newVar('input 2');

  const bodyProgram: TestingRefsFunc.Program = {
    toolName: 'testing-refs-func',
    refs: [ input1.id, input2.id ],
    func: ([ input1Output, input2Output ]) => ({ value: 10 * (input1Output.value as any) + (input2Output.value as any) }),
  };

  it('basically works', () => {
    const closure: Closure = {
      vars: [ input1, input2 ],
      bodyProgram,
      closureVarBindings: empty,
      context,
    }

    const func = closureToSyncFunction(closure);

    expect(func(1, 2)).toEqual(12);

    // not enough arguments
    expect(() => func(1)).toThrow();
  });

  it('works with closed-over variables', () => {
    const closure: Closure = {
      vars: [ input1 ],
      bodyProgram,
      closureVarBindings: {
        [input2.id]: {
          var_: input2,
          outputP: EngraftPromise.resolve({value: 2}),
        },
      },
      context,
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
      context,
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
      context,
    }

    const func = closureToAsyncFunction(closure);

    // set up a delayed resolution
    delayByMs(undefined, 10).then(() => {
      bodyOutputP.resolve({value: 12});
    })

    expect(await func()).toEqual(12);
  });
});

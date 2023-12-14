import { empty } from "@engraft/shared/lib/noOp.js";
import { TestingKnownOutput, TestingRefsFunc, makeTestingContext } from "@engraft/testing-setup";
import { EngraftPromise, RefuncMemory, ToolOutput, newVar, toolFromModule } from "@engraft/toolkit";
import { describe, expect, it } from "vitest";
import * as functionM from "../lib/index.js";

// @vitest-environment happy-dom

const functionTool = toolFromModule(functionM);

const context = makeTestingContext();

describe('function', () => {
  it('output works', () => {
    const memory = new RefuncMemory();

    const input1 = newVar('input 1');
    const input2 = newVar('input 2');

    const bodyProgram: TestingRefsFunc.Program = {
      toolName: 'testing-refs-func',
      refs: [ input1.id, input2.id ],
      func: ([ input1Output, input2Output ]) => ({ value: 10 * (input1Output.value as any) + (input2Output.value as any) }),
    };

    let program: functionM.Program = {
      toolName: 'function',
      argVars: [ input1, input2 ],
      bodyProgram,
      examples: [],
      activeExampleId: 'hmmmm',
    };

    const { outputP } = functionTool.run(memory, {
      program,
      varBindings: empty,
      context,
    });

    const outputState = EngraftPromise.state(outputP);

    if (outputState.status !== 'fulfilled') {
      throw new Error(`Expected outputP to be fulfilled, but it was ${EngraftPromise.state(outputP).status}`);
    }

    const func = outputState.value.value as any;

    expect(func(1, 2)).toEqual(12);
  });

  it('async function output works', async () => {
    const memory = new RefuncMemory();

    const bodyOutputP = EngraftPromise.unresolved<ToolOutput>();

    let program: functionM.Program = {
      toolName: 'function',
      argVars: [ ],
      bodyProgram: {
        toolName: 'testing-known-output',
        outputP: bodyOutputP,
      } satisfies TestingKnownOutput.Program,
      examples: [],
      activeExampleId: 'hmmmm',
    };

    const { outputP } = functionTool.run(memory, {
      program,
      varBindings: empty,
      context,
    });

    const outputState = EngraftPromise.state(outputP);

    if (outputState.status !== 'fulfilled') {
      throw new Error(`Expected outputP to be fulfilled, but it was ${EngraftPromise.state(outputP).status}`);
    }

    const func = outputState.value.value as any;

    function delayByMs<T>(value: T, delayMs: number): EngraftPromise<T> {
      return new EngraftPromise((resolve) => {
        setTimeout(() => {
          resolve(value);
        }, delayMs)
      });
    }

    // set up a delayed resolution
    delayByMs(undefined, 10).then(() => {
      bodyOutputP.resolve({value: 12});
    })

    expect(await func.async(1, 2)).toEqual(12);
  });
});

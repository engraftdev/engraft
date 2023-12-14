import { runTool, toolFromModule } from "@engraft/core";
import { RefuncMemory } from "@engraft/refunc";
import { empty } from "@engraft/shared/lib/noOp.js";
import { describe, expect, it } from "vitest";
import * as Python from "../lib/index.js";
import { makeTestingContext } from "@engraft/testing-setup";

// @vitest-environment happy-dom

const context = makeTestingContext();
context.dispatcher.registerTool(toolFromModule(Python));

describe('python', () => {
  it('basically works', async () => {
    const memory = new RefuncMemory();

    let program: Python.Program = {
      toolName: 'python',
      code: '1 if True else 2',
      subPrograms: {},
    }

    const output = await runTool(memory, {
      program,
      varBindings: empty,
      context,
    }).outputP;

    expect(output).toEqual({ value: 1 });
  });
});

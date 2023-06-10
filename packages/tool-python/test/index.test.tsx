import { registerTool, runTool, toolFromModule } from "@engraft/core";
import { RefuncMemory } from "@engraft/refunc";
import { empty } from "@engraft/shared/lib/noOp.js";
import { registerTestingComponents } from "@engraft/testing-components";
import { describe, expect, it } from "vitest";
import * as Python from "../lib/index.js";

// @vitest-environment happy-dom

registerTestingComponents();

registerTool(toolFromModule(Python));

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
    }).outputP;

    expect(output).toEqual({ value: 1 });
  });
});

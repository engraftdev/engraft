import { EngraftPromise, toolFromModule } from "@engraft/core";
import { RefuncMemory } from "@engraft/refunc";
import { describe, expect, it } from "vitest";
import * as checkbox from "../lib/index.js";

const checkboxTool = toolFromModule(checkbox);

describe('checkbox', () => {
  it('output works', () => {
    const memory = new RefuncMemory();
    [true, false].forEach((checked) => {
      const {outputP} = checkboxTool.run(memory, {
        program: {
          toolName: 'checkbox',
          checked,
        },
        varBindings: {},
      });
      expect(EngraftPromise.state(outputP)).toEqual({status: 'fulfilled', value: {value: checked}});
    });
  })
});

import { EngraftPromise, makeVarBindings, newVar, registerTool, slotWithCode, toolFromModule } from "@engraft/core";
import { RefuncMemory } from "@engraft/refunc";
import { describe, expect, it } from "vitest";
import * as simulation from "../../lib/simulation/index.js";
import Slot from "@engraft/tool-slot";

// @vitest-environment happy-dom

const simulationTool = toolFromModule(simulation);
registerTool(Slot);

describe('simulation', () => {
  it('basically works', () => {
    const stateVar = newVar('state');
    const program: simulation.Program = {
      toolName: 'simulation',
      ticksCount: 3,
      stateVar,
      initProgram: slotWithCode(`0`),
      onTickProgram: slotWithCode(`${stateVar.id} + IDone000000`),
      toDrawProgram: slotWithCode(`<pre>{JSON.stringify(${stateVar.id}, null, 2)}</pre>`)
    };

    expect(
      EngraftPromise.state(
        simulationTool.run(new RefuncMemory(), {
          program,
          varBindings: makeVarBindings({IDone000000: {value: 1}}),
        }).outputP
      ),
    ).toEqual(
      {
        status: 'fulfilled',
        value: {
          value: [0, 1, 2, 3],
        },
      }
    );

    expect(
      simulationTool.computeReferences(program),
    ).toEqual(
      new Set(['IDone000000'])
    );
  });
});
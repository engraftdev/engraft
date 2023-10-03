import { EngraftPromise, dispatcher, makeVarBindings, newVar, references, toolFromModule } from "@engraft/core";
import { RefuncMemory } from "@engraft/refunc";
import { describe, expect, it } from "vitest";
import * as simulation from "../../lib/simulation/index.js";
import { TestingKnownOutput, registerTestingComponents } from "@engraft/testing-components";

// @vitest-environment happy-dom

registerTestingComponents();
const simulationTool = toolFromModule(simulation);
dispatcher().registerTool(simulationTool);

describe('simulation', () => {
  it('basically works', () => {
    const stateVar = newVar('state');
    const program: simulation.Program = {
      toolName: 'simulation',
      ticksCount: 3,
      stateVar,
      initProgram: {
        toolName: 'testing-known-output',
        outputP: EngraftPromise.resolve({ value: 0 }),
      } satisfies TestingKnownOutput.Program,
      onTickProgram: {
        toolName: 'testing-refs-func',
        refs: [stateVar.id, 'IDone000000'],
        func: ([stateVar, one]) => ({ value: stateVar.value as any + one.value as any }),
      } satisfies TestingRefsFunc.Program,
      toDrawProgram: {
        toolName: 'testing-known-output',
        outputP: EngraftPromise.unresolved(),
      } satisfies TestingKnownOutput.Program,
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
      references(program),
    ).toEqual(
      new Set(['IDone000000'])
    );
  });
});

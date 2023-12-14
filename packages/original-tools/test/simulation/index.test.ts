import { EngraftPromise, makeVarBindings, newVar, toolFromModule } from "@engraft/toolkit";
import { RefuncMemory } from "@engraft/toolkit";
import { describe, expect, it } from "vitest";
import * as simulation from "../../lib/simulation/index.js";
import { TestingKnownOutput, TestingRefsFunc, makeTestingContext } from "@engraft/testing-setup";

// @vitest-environment happy-dom

const context = makeTestingContext();
const simulationTool = toolFromModule(simulation);
context.dispatcher.registerTool(toolFromModule(simulationTool));

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
          context,
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
      context.dispatcher.referencesForProgram(program),
    ).toEqual(
      new Set(['IDone000000'])
    );
  });
});

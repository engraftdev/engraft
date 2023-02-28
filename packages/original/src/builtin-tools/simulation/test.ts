import { describe, it } from 'vitest';
import { newVar, registerTool } from '@engraft/core';
import { EngraftPromise } from '@engraft/core';
import { makeVarBindings } from '@engraft/core';
import { toolFromModule } from '@engraft/core';
import { expectToEqual } from '@engraft/test-shared/src/expectToEqual';
import { slotWithCode } from '../slot';
import * as simulation from './index';
import * as slot from '../slot';
import { IncrMemory } from '@engraft/incr';

// @vitest-environment happy-dom

const simulationTool = toolFromModule(simulation);
registerTool(toolFromModule(slot));

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

    expectToEqual(
      EngraftPromise.state(
        simulationTool.run(new IncrMemory(), {
          program,
          varBindings: makeVarBindings({IDone000000: {value: 1}}),
        }).outputP
      ),
      {
        status: 'fulfilled',
        value: {
          value: [0, 1, 2, 3],
        },
      }
    );

    expectToEqual(
      simulationTool.computeReferences(program),
      new Set(['IDone000000'])
    );
  });
});

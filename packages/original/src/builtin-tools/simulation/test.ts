import { describe, it } from 'vitest';
import { newVar, registerTool } from '../../engraft';
import { EngraftPromise } from '../../engraft/EngraftPromise';
import { makeVarBindings } from '../../engraft/test-utils';
import { IncrMemory } from '../../incr';
import { toolFromModule } from '../../engraft/toolFromModule';
import { expectToEqual } from '../../util/expectToEqual';
import { slotSetTo } from '../slot';
import * as simulation from './index';
import * as slot from '../slot';

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
      initProgram: slotSetTo(`0`),
      onTickProgram: slotSetTo(`${stateVar.id} + IDone000000`),
      toDrawProgram: slotSetTo(`<pre>{JSON.stringify(${stateVar.id}, null, 2)}</pre>`)
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

import { describe, it } from '@jest/globals';
import { newVar, registerTool } from 'src/engraft';
import { EngraftPromise } from 'src/engraft/EngraftPromise';
import { makeVarBindings } from 'src/engraft/test-utils';
import { MentoMemory } from 'src/mento';
import { toolFromModule } from 'src/toolFromModule';
import { expectToEqual } from 'src/util/expectToEqual';
import { noOp } from 'src/util/noOp';
import { slotSetTo } from '../slot';
import * as simulation from './index';

const simulationTool = toolFromModule(simulation);
registerTool(toolFromModule(require('../slot')));

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
        simulationTool.run(MentoMemory.create(), {
          program,
          varBindings: makeVarBindings({IDone000000: {value: 1}}),
          updateProgram: noOp,
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

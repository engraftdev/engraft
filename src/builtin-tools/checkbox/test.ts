import { describe, it } from '@jest/globals';
import { EngraftPromise } from 'src/engraft/EngraftPromise';
import { MentoMemory } from 'src/mento';
import { toolFromModule } from 'src/toolFromModule';
import { expectToEqual } from 'src/util/expectToEqual';
import { noOp } from 'src/util/noOp';
import * as checkbox from '.';

const checkboxTool = toolFromModule(checkbox);

describe('checkbox', () => {
  it('output works', () => {
    const memory = MentoMemory.create();
    [true, false].forEach((checked) => {
      const {outputP} = checkboxTool.run(memory, {
        program: {
          toolName: 'checkbox',
          checked,
        },
        varBindings: {},
        updateProgram: noOp,
      });
      expectToEqual(EngraftPromise.state(outputP), {status: 'fulfilled', value: {value: checked}});
    });
  })
});

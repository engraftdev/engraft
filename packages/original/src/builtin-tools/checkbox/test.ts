import { describe, it } from 'vitest';
import { EngraftPromise } from '../../engraft/EngraftPromise';
import { IncrMemory } from '../../incr';
import { toolFromModule } from '../../engraft/toolFromModule';
import { expectToEqual } from '../../util/expectToEqual';
import * as checkbox from '.';

const checkboxTool = toolFromModule(checkbox);

describe('checkbox', () => {
  it('output works', () => {
    const memory = new IncrMemory();
    [true, false].forEach((checked) => {
      const {outputP} = checkboxTool.run(memory, {
        program: {
          toolName: 'checkbox',
          checked,
        },
        varBindings: {},
      });
      expectToEqual(EngraftPromise.state(outputP), {status: 'fulfilled', value: {value: checked}});
    });
  })
});

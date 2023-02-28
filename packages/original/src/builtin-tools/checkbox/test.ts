import { EngraftPromise, toolFromModule } from '@engraft/core';
import { IncrMemory } from '@engraft/incr';
import { expectToEqual } from '@engraft/test-shared/src/expectToEqual';
import { describe, it } from 'vitest';
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

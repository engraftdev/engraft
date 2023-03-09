import { EngraftPromise, toolFromModule } from '@engraft/core';
import { IncrMemory } from '@engraft/incr';
import { describe, expect, it } from 'vitest';
import * as checkbox from '../src';

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
      expect(EngraftPromise.state(outputP)).toEqual({status: 'fulfilled', value: {value: checked}});
    });
  })
});

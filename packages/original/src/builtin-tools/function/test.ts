import { newVar, registerTool } from '../../engraft';
import { EngraftPromise } from '../../engraft/EngraftPromise';
import { toolFromModule } from '../../engraft/toolFromModule';
import { empty } from '../../util/noOp';
import { describe, expect, it } from 'vitest';
import * as functionM from '.';
import * as slot from '../slot';
import { slotSetTo } from '../slot';
import { IncrMemory } from '@engraft/incr';

// @vitest-environment happy-dom

const functionTool = toolFromModule(functionM);

registerTool(functionTool);
registerTool(toolFromModule(slot));

describe('function', () => {
  it('output works', () => {
    const memory = new IncrMemory();

    const input1 = newVar('input 1');
    const input2 = newVar('input 2');

    let program: functionM.Program = {
      toolName: 'function',
      vars: [ input1, input2 ],
      bodyProgram: slotSetTo(`10 * ${input1.id} + ${input2.id}`),
      examples: [],
      activeExampleId: 'hmmmm',
    };

    const { outputP } = functionTool.run(memory, {
      program,
      varBindings: empty,
    });

    const outputState = EngraftPromise.state(outputP);

    if (outputState.status !== 'fulfilled') {
      throw new Error(`Expected outputP to be fulfilled, but it was ${EngraftPromise.state(outputP).status}`);
    }

    const func = outputState.value.value as any;

    expect(func(1, 2)).toEqual(12);
  });
});

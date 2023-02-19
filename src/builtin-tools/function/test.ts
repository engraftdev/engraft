import { describe, it } from '@jest/globals';
import { newVar, registerTool } from 'src/engraft';
import { EngraftPromise } from 'src/engraft/EngraftPromise';
import { IncrMemory } from 'src/incr';
import { toolFromModule } from 'src/engraft/toolFromModule';
import { empty } from 'src/util/noOp';
import * as functionM from '.';
import { slotSetTo } from '../slot';

const functionTool = toolFromModule(functionM);

registerTool(functionTool);
registerTool(toolFromModule(require('../slot')));

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

import { describe, it } from '@jest/globals';
import { registerTool } from 'src/engraft';
import { EngraftPromise } from 'src/engraft/EngraftPromise';
import { runTool } from 'src/engraft/hooks';
import { MentoMemory } from 'src/mento';
import { toolFromModule } from 'src/toolFromModule';
import { expectToEqual } from 'src/util/expectToEqual';
import { empty, noOp } from 'src/util/noOp';

registerTool(toolFromModule(require('./index')));

describe('slot', () => {
  it('basic code works', () => {
    expectToEqual(
      EngraftPromise.state(
        runTool(MentoMemory.create(), {
          program: {
            toolName: 'slot',
            modeName: 'code',
            code: '1 + 1',
          },
          varBindings: empty,
          updateProgram: noOp,
        }).outputP
      ),
      {status: 'fulfilled', value: {value: 2}},
    )
  });

  it('returned promises are resolved into output', () => {
    const {outputP} = runTool(MentoMemory.create(), {
      program: {
        toolName: 'slot',
        modeName: 'code',
        code: 'new Promise((resolve) => setTimeout(() => resolve(2), 10))',
      },
      varBindings: empty,
      updateProgram: noOp,
    });
    expectToEqual(EngraftPromise.state(outputP), {status: 'pending'});
    return outputP.then((value) => expectToEqual(value, {value: 2}));
  });
});

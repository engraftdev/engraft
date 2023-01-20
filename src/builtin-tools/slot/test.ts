import { describe, it } from '@jest/globals';
import { registerTool, ToolOutput } from 'src/engraft';
import { EngraftPromise } from 'src/engraft/EngraftPromise';
import { runTool } from 'src/engraft/hooks';
import { MentoMemory } from 'src/mento';
import { toolFromModule } from 'src/toolFromModule';
import { expectToEqual } from 'src/util/expectToEqual';
import { empty, noOp } from 'src/util/noOp';

const slotTool = toolFromModule(require('./index'));
registerTool(slotTool);

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

  it('returned promises are resolved into output', async () => {
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
    const value = await outputP;
    return expectToEqual(value, { value: 2 });
  });

  it('computes references correctly', () => {
    expectToEqual(
      slotTool.computeReferences({
        toolName: 'slot',
        modeName: 'code',
        code: '1 + 1',
      }),
      new Set()
    );

    expectToEqual(
      slotTool.computeReferences({
        toolName: 'slot',
        modeName: 'code',
        code: 'IDfox000000 + 1',
      }),
      new Set(['IDfox000000'])
    );
  });


  it('resolves references correctly', () => {
    expectToEqual(
      EngraftPromise.state(
        runTool(MentoMemory.create(), {
          program: {
            toolName: 'slot',
            modeName: 'code',
            code: 'IDfox000000 + 1',
          },
          varBindings: {
            IDfox000000: {
              var_: {id: 'IDfox000000', label: 'fox'},
              outputP: EngraftPromise.resolve({value: 100}),
            }
          },
          updateProgram: noOp,
        }).outputP
      ),
      {status: 'fulfilled', value: {value: 101}},
    )
  });

  it('resolves pending references correctly', async () => {
    const foxOutputP = new EngraftPromise<ToolOutput>((resolve) => {
      setTimeout(() => resolve({value: 100}), 10);
    });
    const { outputP } = runTool(MentoMemory.create(), {
      program: {
        toolName: 'slot',
        modeName: 'code',
        code: 'IDfox000000 + 1',
      },
      varBindings: {
        IDfox000000: {
          var_: {id: 'IDfox000000', label: 'fox'},
          outputP: foxOutputP,
        }
      },
      updateProgram: noOp,
    });
    expectToEqual(EngraftPromise.state(outputP), {status: 'pending'});
    const value = await outputP;
    expectToEqual(value, { value: 101 });
  });
});

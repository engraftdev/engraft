import { describe, it } from 'vitest';
import _ from 'lodash';
import { update } from 'src/deps';
import { registerTool, ToolOutput } from 'src/engraft';
import { EngraftPromise } from 'src/engraft/EngraftPromise';
import { makeVarBindings } from 'src/engraft/test-utils';
import { IncrMemory } from 'src/incr';
import { toolFromModule } from 'src/engraft/toolFromModule';
import { expectToEqual } from 'src/util/expectToEqual';
import { empty } from 'src/util/noOp';
import * as slot from './index';

// @vitest-environment happy-dom

const slotTool = toolFromModule(slot);
registerTool(slotTool);  // we test it embedded in itself

describe('slot', () => {
  it('basic code works', () => {
    expectToEqual(
      EngraftPromise.state(
        slotTool.run(new IncrMemory(), {
          program: {
            toolName: 'slot',
            modeName: 'code',
            code: '1 + 1',
            subPrograms: {},
            defaultCode: undefined,
          },
          varBindings: empty,
        }).outputP
      ),
      {status: 'fulfilled', value: {value: 2}},
    )
  });

  it('returned promises are resolved into output', async () => {
    const {outputP} = slotTool.run(new IncrMemory(), {
      program: {
        toolName: 'slot',
        modeName: 'code',
        code: 'new Promise((resolve) => setTimeout(() => resolve(2), 10))',
        subPrograms: {},
        defaultCode: undefined,
      },
      varBindings: empty,
    });
    expectToEqual(EngraftPromise.state(outputP), {status: 'pending'});
    const value = await outputP;
    return expectToEqual(value, { value: 2 });
  });

  it('computes references correctly in code-mode', () => {
    expectToEqual(
      slotTool.computeReferences({
        toolName: 'slot',
        modeName: 'code',
        code: '1 + 1',
        subPrograms: {},
        defaultCode: undefined,
      }),
      new Set()
    );

    expectToEqual(
      slotTool.computeReferences({
        toolName: 'slot',
        modeName: 'code',
        code: 'IDfox000000 + 1',
        subPrograms: {},
        defaultCode: undefined,
      }),
      new Set(['IDfox000000'])
    );
  });

  it('computes references correctly in code-mode with subprograms', () => {
    expectToEqual(
      slotTool.computeReferences({
        toolName: 'slot',
        modeName: 'code',
        code: '1 + IDsubtool000000',
        subPrograms: {
          IDsubtool000000: {
            toolName: 'slot',
            modeName: 'code',
            code: 'IDfox000000 + 1',
            subPrograms: {},
            defaultCode: undefined,
          },
        },
        defaultCode: undefined,
      }),
      new Set(['IDfox000000'])
    );
  });

  it('computes references correctly in tool-mode', () => {
    expectToEqual(
      slotTool.computeReferences({
        toolName: 'slot',
        modeName: 'tool',
        subProgram: {
          toolName: 'slot',
          modeName: 'code',
          code: 'IDfox000000 + 1',
          subPrograms: {},
          defaultCode: undefined,
        },
        defaultCode: undefined,
      }),
      new Set(['IDfox000000'])
    );
  });

  it('resolves references correctly', () => {
    expectToEqual(
      EngraftPromise.state(
        slotTool.run(new IncrMemory(), {
          program: {
            toolName: 'slot',
            modeName: 'code',
            code: 'IDfox000000 + 1',
            subPrograms: {},
            defaultCode: undefined,
          } satisfies slot.Program,
          varBindings: makeVarBindings({IDfox000000: {value: 100}}),
        }).outputP
      ),
      {status: 'fulfilled', value: {value: 101}},
    )
  });

  it('resolves pending references correctly', async () => {
    const foxOutputP = new EngraftPromise<ToolOutput>((resolve) => {
      setTimeout(() => resolve({value: 100}), 10);
    });
    const { outputP } = slotTool.run(new IncrMemory(), {
      program: {
        toolName: 'slot',
        modeName: 'code',
        code: 'IDfox000000 + 1',
        subPrograms: {},
        defaultCode: undefined,
      } satisfies slot.Program,
      varBindings: makeVarBindings({IDfox000000: foxOutputP}),
    });
    expectToEqual(EngraftPromise.state(outputP), {status: 'pending'});
    const value = await outputP;
    expectToEqual(value, { value: 101 });
  });

  it('switches between code & tool modes without accumulating garbage', async () => {
    const memory = new IncrMemory();

    const programCode: slot.Program = {
      toolName: 'slot',
      modeName: 'code',
      code: '1 + 1',
      defaultCode: undefined,
      subPrograms: {},
    };
    const programTool: slot.Program = {
      toolName: 'slot',
      modeName: 'tool',
      subProgram: {
        toolName: 'slot',
        modeName: 'code',
        code: '2 + 2',
        subPrograms: {},
        defaultCode: undefined,
      } satisfies slot.Program,
      defaultCode: undefined,
    }
    let program: slot.Program;
    function runProgram() {
      return EngraftPromise.state(
        slotTool.run(memory, {
          program,
          varBindings: empty,
        }).outputP
      );
    }

    program = programCode;
    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 2}});
    const memoryAfterCode = _.cloneDeep(memory);

    program = programTool;
    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 4}});
    const memoryAfterTool = _.cloneDeep(memory);

    program = programCode;
    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 2}});
    // expectToEqual without stringify fails, probably because of promise-related hijinks
    expectToEqual(JSON.stringify(memory), JSON.stringify(memoryAfterCode));

    program = programTool;
    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 4}});
    // same
    expectToEqual(JSON.stringify(memory), JSON.stringify(memoryAfterTool));
  });

  it('works with subtools', () => {
    expectToEqual(
      EngraftPromise.state(
        slotTool.run(new IncrMemory(), {
          program: {
            toolName: 'slot',
            modeName: 'code',
            code: '1 + IDsubtool000000',
            subPrograms: {
              IDsubtool000000: {
                toolName: 'slot',
                modeName: 'code',
                code: '2 + 2 + IDmoose000000',
                subPrograms: {},
                defaultCode: undefined,
              },
            },
            defaultCode: undefined,
          } satisfies slot.Program,
          varBindings: makeVarBindings({IDmoose000000: {value: 100}}),
        }).outputP
      ),
      {status: 'fulfilled', value: {value: 105}},
    )
  });

  it('does not re-run when irrelevant varBindings change', () => {
    let runs = 0;
    let varBindings = makeVarBindings({
      IDincrementRuns000000: {value: (x: any) => { runs++; return x; }},
      IDrelevant000000: {value: 1},
      IDirrelevant000000: {value: 2},
    });
    const program: slot.Program = {
      toolName: 'slot',
      modeName: 'code',
      code: 'IDincrementRuns000000(IDrelevant000000)',
      subPrograms: {},
      defaultCode: undefined,
    }
    const memory = new IncrMemory();
    function runProgram() {
      return EngraftPromise.state(
        slotTool.run(memory, {
          program,
          varBindings,
        }).outputP
      );
    }

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 1}});
    expectToEqual(runs, 1);
    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 1}});
    expectToEqual(runs, 1);
    varBindings = update(varBindings, {IDrelevant000000: {outputP: {$set: EngraftPromise.resolve({value: 2})}}});
    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 2}});
    expectToEqual(runs, 2);
    varBindings = update(varBindings, {IDirrelevant000000: {outputP: {$set: EngraftPromise.resolve({value: 100})}}});
    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 2}});
    expectToEqual(runs, 2);
  });
});

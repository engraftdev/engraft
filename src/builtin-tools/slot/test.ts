import { describe, it } from '@jest/globals';
import _ from 'lodash';
import { update } from 'src/deps';
import { registerTool, Tool, ToolOutput } from 'src/engraft';
import { EngraftPromise } from 'src/engraft/EngraftPromise';
import { runTool } from 'src/engraft/hooks';
import { makeVarBindings } from 'src/engraft/test-utils';
import { MentoMemory } from 'src/mento';
import { toolFromModule } from 'src/toolFromModule';
import { expectToEqual } from 'src/util/expectToEqual';
import { empty, noOp } from 'src/util/noOp';
import { Program } from '.';

const slotTool = toolFromModule(require('./index')) as unknown as Tool<Program>;  // TODO: don't love this dance
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
        runTool(MentoMemory.create(), {
          program: {
            toolName: 'slot',
            modeName: 'code',
            code: 'IDfox000000 + 1',
            subPrograms: {},
            defaultCode: undefined,
          } satisfies Program,
          varBindings: makeVarBindings({IDfox000000: {value: 100}}),
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
        subPrograms: {},
        defaultCode: undefined,
      } satisfies Program,
      varBindings: makeVarBindings({IDfox000000: foxOutputP}),
      updateProgram: noOp,
    });
    expectToEqual(EngraftPromise.state(outputP), {status: 'pending'});
    const value = await outputP;
    expectToEqual(value, { value: 101 });
  });

  it('switches between code & tool modes without accumulating garbage', async () => {
    const memory = MentoMemory.create();

    const programCode: Program = {
      toolName: 'slot',
      modeName: 'code',
      code: '1 + 1',
      defaultCode: undefined,
      subPrograms: {},
    };
    const programTool: Program = {
      toolName: 'slot',
      modeName: 'tool',
      subProgram: {
        toolName: 'slot',
        modeName: 'code',
        code: '2 + 2',
        defaultCode: undefined,
      },
      defaultCode: undefined,
    }
    let program: Program;
    function runProgram() {
      return EngraftPromise.state(
        runTool(memory, {
          program,
          varBindings: empty,
          updateProgram: noOp,
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
        runTool(MentoMemory.create(), {
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
          } satisfies Program,
          varBindings: makeVarBindings({IDmoose000000: {value: 100}}),
          updateProgram: noOp,
        }).outputP
      ),
      {status: 'fulfilled', value: {value: 105}},
    )
  });

  // TODO: for this to work, we need to dedupe codeReferenceScopeP
  it.failing('does not re-run when irrelevant varBindings change', () => {
    let runs = 0;
    let varBindings = makeVarBindings({
      IDincrementRuns000000: {value: (x: any) => { runs++; return x; }},
      IDrelevant000000: {value: 1},
      IDirrelevant000000: {value: 2},
    });
    const program = {
      toolName: 'slot',
      modeName: 'code',
      code: 'IDincrementRuns000000(IDrelevant000000)',
    }
    const memory = MentoMemory.create();
    function runProgram() {
      return EngraftPromise.state(
        runTool(memory, {
          program,
          varBindings,
          updateProgram: noOp,
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

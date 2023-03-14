import { EngraftPromise, makeVarBindings, registerTool, toolFromModule, ToolOutput } from "@engraft/core";
import { IncrMemory } from "@engraft/incr";
import { updateWithUP } from "@engraft/update-proxy";
import _ from "lodash";
import { describe, expect, it } from "vitest";
import * as slot from "../../../lib/builtin-tools/slot/index.js";
import { empty } from "../../../lib/util/noOp.js";

// @vitest-environment happy-dom

const slotTool = toolFromModule(slot);
registerTool(slotTool);  // we test it embedded in itself

describe('slot', () => {
  it('basic code works', () => {
    expect(
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
    ).toEqual(
      {status: 'fulfilled', value: {value: 2}},
    )
  });

  it('multi-statement code works', () => {
    expect(
      EngraftPromise.state(
        slotTool.run(new IncrMemory(), {
          program: {
            toolName: 'slot',
            modeName: 'code',
            code: 'let x = 1; return x + 1',
            subPrograms: {},
            defaultCode: undefined,
          },
          varBindings: empty,
        }).outputP
      ),
    ).toEqual(
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
    expect(EngraftPromise.state(outputP)).toEqual({status: 'pending'});
    const value = await outputP;
    return expect(value).toEqual({ value: 2 });
  });

  it('computes references correctly in code-mode', () => {
    expect(
      slotTool.computeReferences({
        toolName: 'slot',
        modeName: 'code',
        code: '1 + 1',
        subPrograms: {},
        defaultCode: undefined,
      }),
    ).toEqual(
      new Set()
    );

    expect(
      slotTool.computeReferences({
        toolName: 'slot',
        modeName: 'code',
        code: 'IDfox000000 + 1',
        subPrograms: {},
        defaultCode: undefined,
      }),
    ).toEqual(
      new Set(['IDfox000000'])
    );
  });

  it('computes references correctly in code-mode with subprograms', () => {
    expect(
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
    ).toEqual(
      new Set(['IDfox000000'])
    );
  });

  it('computes references correctly in tool-mode', () => {
    expect(
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
    ).toEqual(
      new Set(['IDfox000000'])
    );
  });

  it('resolves references correctly', () => {
    expect(
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
    ).toEqual(
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
    expect(EngraftPromise.state(outputP)).toEqual({status: 'pending'});
    const value = await outputP;
    expect(value).toEqual({ value: 101 });
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
    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: 2}});
    const memoryAfterCode = _.cloneDeep(memory);

    program = programTool;
    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: 4}});
    const memoryAfterTool = _.cloneDeep(memory);

    program = programCode;
    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: 2}});
    // expect.toEqual without stringify fails, probably because of promise-related hijinks
    expect(JSON.stringify(memory)).toEqual(JSON.stringify(memoryAfterCode));

    program = programTool;
    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: 4}});
    // same
    expect(JSON.stringify(memory)).toEqual(JSON.stringify(memoryAfterTool));
  });

  it('works with subtools', () => {
    expect(
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
    ).toEqual({status: 'fulfilled', value: {value: 105}});
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

    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: 1}});
    expect(runs).toEqual(1);
    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: 1}});
    expect(runs).toEqual(1);
    varBindings = updateWithUP(varBindings, (up) => up.IDrelevant000000.outputP.$set(EngraftPromise.resolve({value: 2})));
    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: 2}});
    expect(runs).toEqual(2);
    varBindings = updateWithUP(varBindings, (up) => up.IDirrelevant000000.outputP.$set(EngraftPromise.resolve({value: 100})));
    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: 2}});
    expect(runs).toEqual(2);
  });
});

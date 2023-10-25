import { EngraftPromise, makeVarBindings, runTool, toolFromModule, ToolOutput } from "@engraft/core";
import { RefuncMemory } from "@engraft/refunc";
import { empty } from "@engraft/shared/lib/noOp.js";
import { updateWithUP } from "@engraft/update-proxy";
import _ from "lodash";
import { describe, expect, it } from "vitest";
import * as slot from "../lib/index.js";
import { makeTestingContext } from "@engraft/testing-components";

// @vitest-environment happy-dom

const context = makeTestingContext();
context.dispatcher.registerTool(toolFromModule(slot));

describe('slot', () => {
  it('basic code works', () => {
    expect(
      EngraftPromise.state(
        runTool(new RefuncMemory(), {
          program: {
            toolName: 'slot',
            modeName: 'code',
            code: '1 + 1',
            subPrograms: {},
            defaultCode: undefined,
          },
          varBindings: empty,
          context,
        }).outputP
      ),
    ).toEqual(
      {status: 'fulfilled', value: {value: 2}},
    )
  });

  it('multi-statement code works', () => {
    expect(
      EngraftPromise.state(
        runTool(new RefuncMemory(), {
          program: {
            toolName: 'slot',
            modeName: 'code',
            code: 'let x = 1; return x + 1',
            subPrograms: {},
            defaultCode: undefined,
          },
          varBindings: empty,
          context,
        }).outputP
      ),
    ).toEqual(
      {status: 'fulfilled', value: {value: 2}},
    )
  });

  it('object literals work', () => {
    expect(
      EngraftPromise.state(
        runTool(new RefuncMemory(), {
          program: {
            toolName: 'slot',
            modeName: 'code',
            code: '{ x: 1, y: 2 }',
            subPrograms: {},
            defaultCode: undefined,
          },
          varBindings: empty,
          context,
        }).outputP
      ),
    ).toEqual(
      {status: 'fulfilled', value: {value: {x: 1, y : 2}}},
    )
  });

  it('returned promises are resolved into output', async () => {
    const {outputP} = runTool(new RefuncMemory(), {
      program: {
        toolName: 'slot',
        modeName: 'code',
        code: 'new Promise((resolve) => setTimeout(() => resolve(2), 10))',
        subPrograms: {},
        defaultCode: undefined,
      },
      varBindings: empty,
      context,
    });
    expect(EngraftPromise.state(outputP)).toEqual({status: 'pending'});
    const value = await outputP;
    return expect(value).toEqual({ value: 2 });
  });

  it('computes references correctly in code-mode', () => {
    expect(
      context.dispatcher.referencesForProgram({
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
      context.dispatcher.referencesForProgram({
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
      context.dispatcher.referencesForProgram({
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
      context.dispatcher.referencesForProgram({
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
        runTool(new RefuncMemory(), {
          program: {
            toolName: 'slot',
            modeName: 'code',
            code: 'IDfox000000 + 1',
            subPrograms: {},
            defaultCode: undefined,
          } satisfies slot.Program,
          varBindings: makeVarBindings({IDfox000000: {value: 100}}),
          context,
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
    const { outputP } = runTool(new RefuncMemory(), {
      program: {
        toolName: 'slot',
        modeName: 'code',
        code: 'IDfox000000 + 1',
        subPrograms: {},
        defaultCode: undefined,
      } satisfies slot.Program,
      varBindings: makeVarBindings({IDfox000000: foxOutputP}),
      context,
    });
    expect(EngraftPromise.state(outputP)).toEqual({status: 'pending'});
    const value = await outputP;
    expect(value).toEqual({ value: 101 });
  });

  it('switches between code & tool modes without accumulating garbage', async () => {
    const memory = new RefuncMemory();

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
        runTool(memory, {
          program,
          varBindings: empty,
          context,
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
        runTool(new RefuncMemory(), {
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
          context,
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
    const memory = new RefuncMemory();
    function runProgram() {
      return runTool(memory, {
        program,
        varBindings,
        context,
      }).outputP
    }

    // first run
    const outputP1 = runProgram();
    expect(EngraftPromise.state(outputP1)).toEqual({status: 'fulfilled', value: {value: 1}});
    expect(runs).toEqual(1);

    // run again with no changes
    const outputP2 = runProgram();
    expect(outputP2).toBe(outputP1);
    expect(runs).toEqual(1);

    // run again with relevant change
    varBindings = updateWithUP(varBindings, (up) => up.IDrelevant000000.outputP.$set(EngraftPromise.resolve({value: 2})));
    const outputP3 = runProgram();
    expect(EngraftPromise.state(outputP3)).toEqual({status: 'fulfilled', value: {value: 2}});
    expect(runs).toEqual(2);

    // run again with irrelevant change
    varBindings = updateWithUP(varBindings, (up) => up.IDirrelevant000000.outputP.$set(EngraftPromise.resolve({value: 100})));
    const outputP4 = runProgram();
    expect(outputP4).toBe(outputP3);
    expect(runs).toEqual(2);
  });
});

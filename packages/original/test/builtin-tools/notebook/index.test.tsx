import { EngraftPromise, makeVarBindings, newVar, registerTool, runTool, slotWithCode, toolFromModule, VarBindings } from "@engraft/core";
import { RefuncMemory } from "@engraft/refunc";
import { updateWithUP } from "@engraft/update-proxy";
import React from "react";
import TestRenderer from "react-test-renderer";
import { describe, expect, it } from "vitest";
import { empty, noOp } from "../../../lib/util/noOp.js";
import { ToolWithView } from "../../../lib/view/ToolWithView.js";
import * as Slot from "../../../lib/builtin-tools/slot/index.js";
import * as TestKnownOutput from "../../../lib/builtin-tools/test-known-output/index.js";
import * as Notebook from "../../../lib/builtin-tools/notebook/index.js";

// @vitest-environment happy-dom

const notebookTool = toolFromModule(Notebook);

registerTool(notebookTool);
registerTool(toolFromModule(TestKnownOutput));
registerTool(toolFromModule(Slot));

const prevVarId = 'IDprev000000';

describe('notebook', () => {
  it('output basically works; no unnecessary runs of cells', () => {
    const memory = new RefuncMemory();

    let cell1Runs = 0;
    let cell2Runs = 0;
    let program: Notebook.Program = {
      toolName: 'notebook',
      cells: [
        {
          var_: {id: 'cell1', label: ''},
          program: {
            toolName: 'test-known-output',
            outputP: EngraftPromise.resolve({ value: 1 }),
            onRun: () => { cell1Runs++ },
          } satisfies TestKnownOutput.Program,
          outputManualHeight: undefined,
        },
        {
          var_: {id: 'cell2', label: ''},
          program: {
            toolName: 'test-known-output',
            outputP: EngraftPromise.resolve({ value: 2 }),
            onRun: () => { cell2Runs++ },
          } satisfies TestKnownOutput.Program,
          outputManualHeight: undefined,
        },
      ],
      prevVarId
    }
    function runProgram() {
      return EngraftPromise.state(
        runTool(memory, {
          program,
          varBindings: empty,
        }).outputP
      );
    }

    // console.log("run 1");

    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: 2}});
    expect(cell1Runs).toEqual(1);
    expect(cell2Runs).toEqual(1);

    // console.log("run 2");

    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: 2}});
    expect(cell1Runs).toEqual(1);
    expect(cell2Runs).toEqual(1);

    program = updateWithUP(program, (programUP) => {
      programUP.cells[1].program.$as<TestKnownOutput.Program>().outputP.$set(EngraftPromise.resolve({ value: 3 }));
    });

    // console.log("run 3");

    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: 3}});
    expect(cell1Runs).toEqual(1);
    expect(cell2Runs).toEqual(2);
  });

  it('prev works', () => {
    let program: Notebook.Program = {
      toolName: 'notebook',
      cells: [
        {
          var_: {id: 'cell1', label: ''},
          program: slotWithCode('100'),
          outputManualHeight: undefined,
        },
        {
          var_: {id: 'cell2', label: ''},
          program: slotWithCode(`${prevVarId} + 1`),
          outputManualHeight: undefined,
        },
      ],
      prevVarId
    };

    expect(
      EngraftPromise.state(
        runTool(new RefuncMemory(), {
          program,
          varBindings: empty,
        }).outputP
      ),
    ).toEqual(
      {
        status: 'fulfilled',
        value: {
          value: 101,
        },
      }
    );

    expect(
      notebookTool.computeReferences(program),
    ).toEqual(
      new Set()
    );
  });

  it('changing earlier cell through external binding propagates to later cell', () => {
    const memory = new RefuncMemory();
    const externalVar = newVar('external');
    const cell1 = newVar('cell1');
    const cell2 = newVar('cell2');
    let program: Notebook.Program = {
      toolName: 'notebook',
      cells: [
        {
          var_: cell1,
          program: slotWithCode(`${externalVar.id} + 10`),
          outputManualHeight: undefined,
        },
        {
          var_: cell2,
          program: slotWithCode(`${cell1.id} + 20`),
          outputManualHeight: undefined,
        }
      ],
      prevVarId
    }
    let varBindings: VarBindings;
    function runProgram() {
      return EngraftPromise.state(
        runTool(memory, {
          program,
          varBindings,
        }).outputP
      );
    }

    varBindings = makeVarBindings({[externalVar.id]: {value: 1}});
    expect(
      runProgram(),
    ).toEqual(
      {status: 'fulfilled', value: {value: 31}},
    );

    varBindings = makeVarBindings({[externalVar.id]: {value: 100}});
    expect(
      runProgram(),
    ).toEqual(
      {status: 'fulfilled', value: {value: 130}},
    );
  });

  it.skip('no unnecessary renders of cells', () => {
    let cell1ViewRenders = 0;
    let cell2ViewRenders = 0;
    let program: Notebook.Program = {
      toolName: 'notebook',
      cells: [
        {
          var_: {id: 'cell1', label: ''},
          program: {
            toolName: 'test-known-output',
            outputP: EngraftPromise.resolve({ value: 1 }),
            onViewRender: () => { cell1ViewRenders++ },
          } satisfies TestKnownOutput.Program,
          outputManualHeight: undefined,
        },
        {
          var_: {id: 'cell2', label: ''},
          program: {
            toolName: 'test-known-output',
            outputP: EngraftPromise.resolve({ value: 2 }),
            onViewRender: () => { cell2ViewRenders++ },
          } satisfies TestKnownOutput.Program,
          outputManualHeight: undefined,
        },
      ],
      prevVarId
    }

    const component = TestRenderer.create(<React.Fragment/>);
    function runProgram() {
      component.update(
        <ToolWithView
          program={program}
          varBindings={empty}
          updateProgram={noOp}
          reportOutputState={noOp}
        />
      );
    }

    // console.log("run 1");

    runProgram();
    expect(cell1ViewRenders).toEqual(1);
    expect(cell2ViewRenders).toEqual(1);

    // console.log("run 2");

    runProgram();
    expect(cell1ViewRenders).toEqual(1);
    expect(cell2ViewRenders).toEqual(1);

    program = updateWithUP(program, (programUP) => {
      programUP.cells[1].program.$as<TestKnownOutput.Program>().outputP.$set(EngraftPromise.resolve({ value: 3 }));
    });

    // console.log("run 3");

    runProgram();
    expect(cell1ViewRenders).toEqual(1);
    expect(cell2ViewRenders).toEqual(2);
  });

  it('no unnecessary runs of cells (with an inter-cell dependency)', () => {
    const memory = new RefuncMemory();

    const cell1 = newVar('cell1');
    const cell2 = newVar('cell2');
    const cell3 = newVar('cell3');
    let cell1Runs = 0;
    let cell2Runs = 0;
    let cell3Runs = 0;
    const cell2Run = newVar('cell2Run');
    const varBindings = makeVarBindings({[cell2Run.id]: {value: () => cell2Runs++}});
    let program: Notebook.Program = {
      toolName: 'notebook',
      cells: [
        {
          var_: cell1,
          program: {
            toolName: 'test-known-output',
            outputP: EngraftPromise.resolve({ value: 1 }),
            onRun: () => { cell1Runs++ },
          } satisfies TestKnownOutput.Program,
          outputManualHeight: undefined,
        },
        {
          var_: cell2,
          program: slotWithCode(`${cell2Run.id}(); return ${cell1.id} + 1`),
          // program: {
          //   toolName: 'test-known-output',
          //   outputP: EngraftPromise.resolve({ value: 2 }),
          //   onRun: () => { cell2Runs++ },
          // } satisfies TestKnownOutput.Program,
          outputManualHeight: undefined,
        },
        {
          var_: cell3,
          program: {
            toolName: 'test-known-output',
            outputP: EngraftPromise.resolve({ value: 3 }),
            onRun: () => { cell3Runs++ },
          } satisfies TestKnownOutput.Program,
          outputManualHeight: undefined,
        },
      ],
      prevVarId
    }
    function runProgram() {
      return EngraftPromise.state(
        notebookTool.run(memory, {
          program,
          varBindings,
        }).outputP
      );
    }

    // first run
    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: 3}});
    expect(cell1Runs).toEqual(1);
    expect(cell2Runs).toEqual(1);
    expect(cell3Runs).toEqual(1);

    // run without changes
    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: 3}});
    expect(cell1Runs).toEqual(1);
    expect(cell2Runs).toEqual(1);
    expect(cell3Runs).toEqual(1);

    // run with change to cell 3
    program = updateWithUP(program, (programUP) => {
      programUP.cells[2].program.$as<TestKnownOutput.Program>().outputP.$set(EngraftPromise.resolve({ value: 4 }));
    });
    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: 4}});
    expect(cell1Runs).toEqual(1);
    expect(cell2Runs).toEqual(1);
    expect(cell3Runs).toEqual(2);
  });
});

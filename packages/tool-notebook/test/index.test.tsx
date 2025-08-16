import { EngraftPromise, makeVarBindings, newVar, runTool, toolFromModule, VarBindings } from "@engraft/core";
import { ToolWithView } from "@engraft/hostkit";
import { RefuncMemory } from "@engraft/refunc";
import { empty, noOp } from "@engraft/shared/lib/noOp.js";
import { makeTestingContext, TestingKnownOutput, TestingRefsFunc } from "@engraft/testing-setup";
import { updateWithUP } from "update-proxy";
import React from "react";
import TestRenderer from "react-test-renderer";
import { describe, expect, it } from "vitest";
import * as Notebook from "../lib/index.js";

// @vitest-environment happy-dom

const context = makeTestingContext();
const notebookTool = toolFromModule(Notebook);
context.dispatcher.registerTool(notebookTool);

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
            toolName: 'testing-known-output',
            outputP: EngraftPromise.resolve({ value: 1 }),
            onRun: () => { cell1Runs++ },
          } satisfies TestingKnownOutput.Program,
          outputManualHeight: undefined,
        },
        {
          var_: {id: 'cell2', label: ''},
          program: {
            toolName: 'testing-known-output',
            outputP: EngraftPromise.resolve({ value: 2 }),
            onRun: () => { cell2Runs++ },
          } satisfies TestingKnownOutput.Program,
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
          context,
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
      programUP.cells[1].program.$as<TestingKnownOutput.Program>().outputP.$set(EngraftPromise.resolve({ value: 3 }));
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
          program: {
            toolName: 'testing-refs-func',
            refs: [],
            func: () => ({ value: 100 }),
          } satisfies TestingRefsFunc.Program,
          outputManualHeight: undefined,
        },
        {
          var_: {id: 'cell2', label: ''},
          program: {
            toolName: 'testing-refs-func',
            refs: [prevVarId],
            func: ([prevVar]) => ({ value: prevVar.value as any + 1 }),
          } satisfies TestingRefsFunc.Program,
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
          context,
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
      context.dispatcher.referencesForProgram(program),
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
          program: {
            toolName: 'testing-refs-func',
            refs: [externalVar.id],
            func: ([externalVar]) => ({ value: externalVar.value as any + 10 }),
          } satisfies TestingRefsFunc.Program,
          outputManualHeight: undefined,
        },
        {
          var_: cell2,
          program: {
            toolName: 'testing-refs-func',
            refs: [cell1.id],
            func: ([cell1]) => ({ value: cell1.value as any + 20 }),
          } satisfies TestingRefsFunc.Program,
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
          context,
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
            toolName: 'testing-known-output',
            outputP: EngraftPromise.resolve({ value: 1 }),
            onViewRender: () => { cell1ViewRenders++ },
          } satisfies TestingKnownOutput.Program,
          outputManualHeight: undefined,
        },
        {
          var_: {id: 'cell2', label: ''},
          program: {
            toolName: 'testing-known-output',
            outputP: EngraftPromise.resolve({ value: 2 }),
            onViewRender: () => { cell2ViewRenders++ },
          } satisfies TestingKnownOutput.Program,
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
          context={context}
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
      programUP.cells[1].program.$as<TestingKnownOutput.Program>().outputP.$set(EngraftPromise.resolve({ value: 3 }));
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
            toolName: 'testing-known-output',
            outputP: EngraftPromise.resolve({ value: 1 }),
            onRun: () => { cell1Runs++ },
          } satisfies TestingKnownOutput.Program,
          outputManualHeight: undefined,
        },
        {
          var_: cell2,
          program: {
            toolName: 'testing-refs-func',
            refs: [cell1.id],
            func: ([cell1]) => ({ value: cell1.value as any + 1 }),
            onRun: () => { cell2Runs++ },
          } satisfies TestingRefsFunc.Program,
          outputManualHeight: undefined,
        },
        {
          var_: cell3,
          program: {
            toolName: 'testing-known-output',
            outputP: EngraftPromise.resolve({ value: 3 }),
            onRun: () => { cell3Runs++ },
          } satisfies TestingKnownOutput.Program,
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
          context,
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
      programUP.cells[2].program.$as<TestingKnownOutput.Program>().outputP.$set(EngraftPromise.resolve({ value: 4 }));
    });
    expect(runProgram()).toEqual({status: 'fulfilled', value: {value: 4}});
    expect(cell1Runs).toEqual(1);
    expect(cell2Runs).toEqual(1);
    expect(cell3Runs).toEqual(2);
  });
});

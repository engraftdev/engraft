import { EngraftPromise, makeVarBindings, newVar, registerTool, slotWithCode, toolFromModule, VarBindings } from '@engraft/core';
import { IncrMemory } from '@engraft/incr';
import { expectToEqual } from '@engraft/test-shared/src/expectToEqual';
import { updateWithUP } from '@engraft/update-proxy';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { describe, it } from 'vitest';
import { empty, noOp } from '../../../src/util/noOp';
import { ToolWithView } from '../../../src/view/ToolWithView';
import * as Slot from '../../../src/builtin-tools/slot';
import * as TestKnownOutput from '../../../src/builtin-tools/test-known-output';
import * as Notebook from '../../../src/builtin-tools/notebook/index';

// @vitest-environment happy-dom

const notebookTool = toolFromModule(Notebook);

registerTool(notebookTool);
registerTool(toolFromModule(TestKnownOutput));
registerTool(toolFromModule(Slot));

describe('notebook', () => {
  it('output basically works; no unnecessary runs of cells', () => {
    const memory = new IncrMemory();

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
      prevVar:  {id: 'prev', label: ''}
    }
    function runProgram() {
      return EngraftPromise.state(
        notebookTool.run(memory, {
          program,
          varBindings: empty,
        }).outputP
      );
    }

    // console.log("run 1");

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 2}});
    expectToEqual(cell1Runs, 1);
    expectToEqual(cell2Runs, 1);

    // console.log("run 2");

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 2}});
    expectToEqual(cell1Runs, 1);
    expectToEqual(cell2Runs, 1);

    program = updateWithUP(program, (programUP) => {
      programUP.cells[1].program.$as<TestKnownOutput.Program>().outputP.$set(EngraftPromise.resolve({ value: 3 }));
    });

    // console.log("run 3");

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 3}});
    expectToEqual(cell1Runs, 1);
    expectToEqual(cell2Runs, 2);
  });

  it('prev works', () => {
    const prevVar = newVar('prev');

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
          program: slotWithCode(`${prevVar.id} + 1`),
          outputManualHeight: undefined,
        },
      ],
      prevVar
    };

    expectToEqual(
      EngraftPromise.state(
        notebookTool.run(new IncrMemory(), {
          program,
          varBindings: empty,
        }).outputP
      ),
      {
        status: 'fulfilled',
        value: {
          value: 101,
        },
      }
    );

    expectToEqual(
      notebookTool.computeReferences(program),
      new Set()
    );
  });

  it('changing earlier cell through external binding propagates to later cell', () => {
    const memory = new IncrMemory();
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
      prevVar: newVar('prev')
    }
    let varBindings: VarBindings;
    function runProgram() {
      return EngraftPromise.state(
        notebookTool.run(memory, {
          program,
          varBindings,
        }).outputP
      );
    }

    varBindings = makeVarBindings({[externalVar.id]: {value: 1}});
    expectToEqual(
      runProgram(),
      {status: 'fulfilled', value: {value: 31}},
    );

    varBindings = makeVarBindings({[externalVar.id]: {value: 100}});
    expectToEqual(
      runProgram(),
      {status: 'fulfilled', value: {value: 130}},
    );
  });

  it('no unnecessary renders of cells', () => {
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
      prevVar:  {id: 'prev', label: ''}
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
    expectToEqual(cell1ViewRenders, 1);
    expectToEqual(cell2ViewRenders, 1);

    // console.log("run 2");

    runProgram();
    expectToEqual(cell1ViewRenders, 1);
    expectToEqual(cell2ViewRenders, 1);

    program = updateWithUP(program, (programUP) => {
      programUP.cells[1].program.$as<TestKnownOutput.Program>().outputP.$set(EngraftPromise.resolve({ value: 3 }));
    });

    // console.log("run 3");

    runProgram();
    expectToEqual(cell1ViewRenders, 1);
    expectToEqual(cell2ViewRenders, 2);
  });
});
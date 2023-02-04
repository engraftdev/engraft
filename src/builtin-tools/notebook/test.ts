import { describe, it } from '@jest/globals';
import { update } from 'src/deps';
import { newVar, registerTool, VarBindings } from 'src/engraft';
import { EngraftPromise } from 'src/engraft/EngraftPromise';
import { makeVarBindings } from 'src/engraft/test-utils';
import { IncrMemory } from 'src/incr';
import { toolFromModule } from 'src/toolFromModule';
import { expectToEqual } from 'src/util/expectToEqual';
import { empty } from 'src/util/noOp';
import { slotSetTo } from '../slot';
import * as notebook from './index';

const notebookTool = toolFromModule(notebook);

registerTool(toolFromModule(require('../test-value')));
registerTool(toolFromModule(require('../slot')));

describe('notebook', () => {
  it('output basically works; no unnecessary runs of cells', () => {
    const memory = new IncrMemory();

    let cell1Runs = 0;
    let cell2Runs = 0;
    let program: notebook.Program = {
      toolName: 'notebook',
      cells: [
        {
          var_: {id: 'cell1', label: ''},
          program: {
            toolName: 'test-value',
            value: 1,
            onRun: () => { cell1Runs++ },
          },
          outputManualHeight: undefined,
        },
        {
          var_: {id: 'cell2', label: ''},
          program: {
            toolName: 'test-value',
            value: 2,
            onRun: () => { cell2Runs++ },
          },
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

    program = update(program, {cells: {1: {program: {value: {$set: 3}}}}});

    // console.log("run 3");

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 3}});
    expectToEqual(cell1Runs, 1);
    expectToEqual(cell2Runs, 2);
  });

  it('prev works', () => {
    const prevVar = newVar('prev');

    let program: notebook.Program = {
      toolName: 'notebook',
      cells: [
        {
          var_: {id: 'cell1', label: ''},
          program: slotSetTo('100'),
          outputManualHeight: undefined,
        },
        {
          var_: {id: 'cell2', label: ''},
          program: slotSetTo(`${prevVar.id} + 1`),
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
    let program: notebook.Program = {
      toolName: 'notebook',
      cells: [
        {
          var_: cell1,
          program: slotSetTo(`${externalVar.id} + 10`),
          outputManualHeight: undefined,
        },
        {
          var_: cell2,
          program: slotSetTo(`${cell1.id} + 20`),
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
});

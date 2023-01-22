import { describe, it } from '@jest/globals';
import { update } from 'src/deps';
import { newVar, registerTool } from 'src/engraft';
import { EngraftPromise } from 'src/engraft/EngraftPromise';
import { runTool } from 'src/engraft/hooks';
import { MentoMemory } from 'src/mento';
import { toolFromModule } from 'src/toolFromModule';
import { expectToEqual } from 'src/util/expectToEqual';
import { empty, noOp } from 'src/util/noOp';
import { Program } from './index';

registerTool(toolFromModule(require('.')));
registerTool(toolFromModule(require('../test-value')));

describe('notebook', () => {
  // TODO: We need to be smarter about wiring notebook cells together for this to work.
  it.failing('output basically works; no unnecessary runs of cells', () => {
    const memory = MentoMemory.create();

    let cell1Runs = 0;
    let cell2Runs = 0;
    let program: Program = {
      toolName: 'notebook',
      cells: [
        {
          var_: newVar('cell1'),
          program: {
            toolName: 'test-value',
            value: 1,
            onRun: () => { cell1Runs++ },
          },
          outputManualHeight: undefined,
        },
        {
          var_: newVar('cell2'),
          program: {
            toolName: 'test-value',
            value: 2,
            onRun: () => { cell2Runs++ },
          },
          outputManualHeight: undefined,
        },
      ],
      prevVar: newVar('prev')
    }
    function runProgram() {
      return EngraftPromise.state(
        runTool(memory, {
          program,
          varBindings: empty,
          updateProgram: noOp,
        }).outputP
      );
    }

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 2}});
    expectToEqual(cell1Runs, 1);
    expectToEqual(cell2Runs, 1);

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 2}});
    expectToEqual(cell1Runs, 1);
    expectToEqual(cell2Runs, 1);

    program = update(program, {cells: {1: {program: {value: {$set: 3}}}}});

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: 3}});
    expectToEqual(cell1Runs, 1);
    expectToEqual(cell2Runs, 2);
  });
});

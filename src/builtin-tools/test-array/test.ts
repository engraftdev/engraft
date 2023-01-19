import { describe, it } from '@jest/globals';
import { update } from 'src/deps';
import { registerTool } from 'src/engraft';
import { EngraftPromise } from 'src/engraft/EngraftPromise';
import { runTool } from 'src/engraft/hooks';
import { MentoMemory } from 'src/mento';
import { toolFromModule } from 'src/toolFromModule';
import { expectToEqual } from 'src/util/expectToEqual';
import { empty, noOp } from 'src/util/noOp';
import { Program } from './index';

registerTool(toolFromModule(require('./test-array')));
registerTool(toolFromModule(require('./test-value')));

describe('test-array', () => {
  it('output basically works; no unnecessary runs of subtools', () => {
    const memory = MentoMemory.create();

    let subTool1Runs = 0;
    let subTool2Runs = 0;
    let program: Program = {
      toolName: 'test-array',
      subToolPrograms: [
        {
          toolName: 'test-value',
          value: 1,
          onRun: () => { subTool1Runs++ },
        },
        {
          toolName: 'test-value',
          value: 2,
          onRun: () => { subTool2Runs++ },
        },
      ],
    };
    function runProgram() {
      return EngraftPromise.state(
        runTool(memory, {
          program,
          varBindings: empty,
          updateProgram: noOp,
        }).outputP
      );
    }

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: [1, 2]}});
    expectToEqual(subTool1Runs, 1);
    expectToEqual(subTool2Runs, 1);

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: [1, 2]}});
    expectToEqual(subTool1Runs, 1);
    expectToEqual(subTool2Runs, 1);

    program = update(program, {subToolPrograms: {0: {value: {$set: 3}}}});

    expectToEqual(runProgram(), {status: 'fulfilled', value: {value: [3, 2]}});
    expectToEqual(subTool1Runs, 2);
    expectToEqual(subTool2Runs, 1);
  });
});

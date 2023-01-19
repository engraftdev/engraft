import {expect, it} from '@jest/globals';
import { lookUpTool, registerTool, ToolOutput, ToolView } from 'src/tools-framework/tools';
import { empty, noOp } from 'src/util/noOp';
import ReactCell from 'src/util/ReactCell';
import { slotSetTo } from '.';

[require(".")].map(registerTool);

it('runs simple JavaScript in code mode', () => {
  const cell = new ReactCell();

  const program = slotSetTo('1 + 2');

  const toolName = program.toolName;
  const Tool = lookUpTool(toolName);

  let output: ToolOutput | null = null;
  let view: ToolView | null = null;

  const component = <Tool.Component
    program={program}
    updateProgram={noOp}
    varBindings={empty}
    reportOutput={(o) => output = o}
    reportView={(v) => view = v}
  />;

  cell.update(component);

  expect(output).toEqual({value: 3});
  expect(view).not.toBeNull();
});

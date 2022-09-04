import { useEffect } from 'react';
import './App.css';
import { lookUpTool, ToolOutput, ToolProgram, ToolView } from './tools-framework/tools';
import ReactCell from './util/ReactCell';

import { examples } from './examples/examples';

function exampleByName(name: string) {
  return examples.find((example) => example.name === name);
}

export function TestSync() {
  useEffect(() => {
    const cell = new ReactCell();

    const program = exampleByName('2022-02-27-color-picker')?.program as ToolProgram | undefined;

    if (!program) {
      throw new Error('No program found');
    }

    // const program: AdderProgram = {
    //   toolName: 'adder',
    //   xProgram: slotSetTo('10'),
    //   yProgram: slotSetTo('20'),
    // }


    const toolName = program.toolName;
    const Tool = lookUpTool(toolName);

    let output: ToolOutput | null = null;
    let view: ToolView | null = null;

    const component = <Tool.Component
      program={program}
      updateProgram={() => {}}
      reportOutput={(o) => output = o}
      reportView={(v) => view = v}
    />

    cell.update(component);
    console.log('cell', cell.testRenderer?.toJSON());
    console.log('output', output);
    console.log('view', view);
  })

  return (
    <main>
      <h1>TestSync</h1>
    </main>
  );
}

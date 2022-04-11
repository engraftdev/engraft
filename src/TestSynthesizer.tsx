import { memo } from 'react';
import { VarInfo } from './tools-framework/tools';
import './tools/builtInTools';
import { CodeConfig, codeConfigSetTo } from './tools/CodeTool';
import { synthesizeGen } from './util/synthesizer';
import { runToCompletion } from './util/Task';
import { Value } from './view/Value';


const synthesisPrompts: [any, any][][] = [
  [
    ["George Washington Carver", "GWC"],
    ["Josh Horowitz", "JH"],
    ["Paula Te", "PT"]
  ],
  [
    ["George Washington Carver", "George"],
    ["Josh Horowitz", "Josh"],
    ["Paula Te", "Paula"]
  ],
  [
    ["George Washington Carver", 3],
    ["Josh Horowitz", 2],
    ["Paula Te", 2]
  ],
  [
    [[1, 2], 3],
    [[2, 0], 2],
    [[3, -1], 2]
  ],
  // [
  //   [["George Washington Carver", 1], "Washington"],
  //   [["Josh Horowitz", 0], "Josh"],
  //   [["Paula Te", 1], "Te"]
  // ],
  // [
  //   [["George Washington Carver", 2], "Washington"],
  //   [["Josh Horowitz", 1], "Josh"],
  //   [["Paula Te", 2], "Te"]
  // ],
]

const TestSynthesizer = memo(function TestSynthesizer() {
  return <div>
    {synthesisPrompts.map((prompt, i) =>
      <div key={i}>
        <Value value={prompt}/>
        <button
          onClick={() => {
            console.log(runToCompletion(synthesizeGen(prompt)))
          }}>
          Run
        </button>
        <hr/>
      </div>
    )}
  </div>
});

export default TestSynthesizer;

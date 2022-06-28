import { memo } from 'react';
import { synthesizeGen } from './synthesizer';
import { runToCompletion } from 'src/util/Task';
import { Value } from 'src/view/Value';


const synthesisPrompts: [any, any][][] = [
  [
    ["George Washington Carver", "GWC"],
    ["Josh Horowitz", "JH"],
    ["Paula Te", "PT"],
  ],
  [
    ["George Washington Carver", "George"],
    ["Josh Horowitz", "Josh"],
    ["Paula Te", "Paula"],
  ],
  [
    ["George Washington Carver", 3],
    ["Josh Horowitz", 2],
    ["Paula Te", 2]
  ],
  [
    [[1, 2], 3],
    [[2, 0], 2],
    [[3, -1], 2],
  ],
  [
    [["George Washington Carver", 1], "Washington"],
    [["Josh Horowitz", 0], "Josh"],
    [["Paula Te", 1], "Te"],
  ],
  [
    ["josh", "Josh"],
    ["heh", "Heh"],
  ],
  [
    ["josh", "J"],
    ["heh", "H"],
  ],
]

export const TestSynthesizer = memo(function TestSynthesizer() {
  return <div>
    {synthesisPrompts.map((prompt, i) =>
      <div key={i}>
        <Value value={prompt}/>
        <button
          onClick={() => {
            const startTime = performance.now()
            const result = runToCompletion(synthesizeGen(prompt));
            const duration = performance.now() - startTime;
            console.log(Math.round(duration), result);
          }}>
          Run
        </button>
        <hr/>
      </div>
    )}
  </div>
});

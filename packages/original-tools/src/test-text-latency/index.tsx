import { EngraftPromise, Tool, ToolProps, ToolView, ToolViewRenderProps, hookMemo, hooks, memoizeProps, renderWithReact, up } from "@engraft/toolkit";
import { memo, useState } from "react";

// A testbed for debugging the cursor-jumping-to-end-of-text problem.

// Observation: There's an extra tick between onChange and render when you go through an Engraft program.
// Theory: A chain of two (top-level) setStates is involved – first you set the program, then you set the view.

export type Program = {
  toolName: 'test-text-latency',
  text: string,
}

export const tool: Tool<Program> = {
  name: 'test-text-latency',

  makeProgram: () => ({
    toolName: 'test-text-latency',
    text: '',
  }),

  collectReferences: () => [],

  run: memoizeProps(hooks((props) => {
    const { program } = props;

    const outputP = hookMemo(() => EngraftPromise.resolve({
      value: program.text
    }), [program.text]);

    const view: ToolView<Program> = hookMemo(() => ({
      render: renderWithReact((renderProps) => <View {...props} {...renderProps} />),
    }), [props]);

    return { outputP, view };
  })),
};

const View = memo((props: ToolProps<Program> & ToolViewRenderProps<Program>) => {
  const {program, updateProgram} = props;
  const programUP = up(updateProgram);

  console.log("render test-text view");

  const [text, setText] = useState('');

  return (
    <div className="xCol xGap10">
      <div className="xRow xGap10">
        <b>text in program</b>
        <input
          type="text"
          value={program.text}
          onChange={(e) => {
            programUP.text.$set(e.target.value)
            console.log('onChange program')
            requestAnimationFrame(() => {
              console.log('onChange program + 1')
              requestAnimationFrame(() => {
                console.log('onChange program + 2')
              });
            });
          }}
        />
      </div>
      <div className="xRow xGap10">
        <b>text in view state</b>
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            console.log('onChange view state')
            requestAnimationFrame(() => {
              console.log('onChange view state + 1')
              requestAnimationFrame(() => {
                console.log('onChange view state + 2')
              });
            });
          }}
        />
      </div>
    </div>
  );
});

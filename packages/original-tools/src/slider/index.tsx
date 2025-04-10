import { useContextMenu } from "@engraft/shared/lib/useContextMenu.js";
import { EngraftPromise, MyContextMenu, MyContextMenuHeading, Tool, ToolProps, ToolView, ToolViewRenderProps, hookMemo, hooks, memoizeProps, renderWithReact, up } from "@engraft/toolkit";
import { memo, useCallback } from "react";


export type Program = {
  toolName: 'slider',
  value: number,
  min: number,
  max: number,
  step: number,
}

export const tool: Tool<Program> = {
  name: 'slider',

  makeProgram: () => ({
    toolName: 'slider',
    value: 0,
    min: -10,
    max: 10,
    step: 1,
  }),

  collectReferences: () => [],

  run: memoizeProps(hooks((props) => {
    const { program } = props;

    const outputP = hookMemo(() => EngraftPromise.resolve({
      value: program.value
    }), [program.value]);

    const view: ToolView<Program> = hookMemo(() => ({
      render: renderWithReact((renderProps) => <View {...props} {...renderProps} />),
    }), [props]);

    return { outputP, view };
  })),
};

const View = memo((props: ToolProps<Program> & ToolViewRenderProps<Program>) => {
  const { program, updateProgram } = props;
  const programUP = up(updateProgram);

  const { openMenu, menuNode } = useContextMenu(useCallback((closeMenu) =>
    <MyContextMenu>
      <MyContextMenuHeading>Slider</MyContextMenuHeading>
      <div>
        <input type='number' value={program.min} onChange={(ev) => programUP.min.$set(+ev.target.value)} /> min
      </div>
      <div>
        <input type='number' value={program.max} onChange={(ev) => programUP.max.$set(+ev.target.value)} /> max
      </div>
      <div>
        <input type='number' value={program.step} onChange={(ev) => programUP.step.$set(+ev.target.value)} /> step
      </div>
    </MyContextMenu>
  , [program.min, program.max, program.step, programUP.min, programUP.max, programUP.step]));

  return <div style={{padding: 10}} onContextMenu={openMenu}>
    {menuNode}
    <input
      type="range"
      value={program.value}
      onChange={(e) => programUP.value.$set(+e.target.value)}
      min={program.min} max={program.max} step={program.step}/>
    {' '}
    <div style={{display: 'inline-block', width: 30, textAlign: "right"}}>{program.value}</div>
  </div>;
});


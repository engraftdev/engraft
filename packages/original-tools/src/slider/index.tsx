import { EngraftPromise, Tool, ToolProps, ToolView, ToolViewRenderProps } from "@engraft/core";
import { hookMemo, hooks, memoizeProps } from "@engraft/refunc";
import { memo, useCallback } from "react";
import { useUpdateProxy } from "@engraft/update-proxy-react";
import { useContextMenu } from "@engraft/shared/lib/useContextMenu.js";
import { MyContextMenu, MyContextMenuHeading } from "@engraft/core-widgets";


export type Program = {
  toolName: 'slider',
  value: number,
  min: number,
  max: number,
  step: number,
}

export const tool: Tool<Program> = {
  makeProgram: () => ({
    toolName: 'slider',
    value: 0,
    min: -10,
    max: 10,
    step: 1,
  }),

  computeReferences: () => new Set(),

  run: memoizeProps(hooks((props) => {
    const { program } = props;

    const outputP = hookMemo(() => EngraftPromise.resolve({
      value: program.value
    }), [program.value]);

    const view: ToolView<Program> = hookMemo(() => ({
      render: (renderProps) => <View {...props} {...renderProps} />
    }), [props]);

    return { outputP, view };
  })),
};

const View = memo((props: ToolProps<Program> & ToolViewRenderProps<Program>) => {
  const { program, updateProgram } = props;
  const programUP = useUpdateProxy(updateProgram);

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


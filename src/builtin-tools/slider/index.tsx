import { memo, useCallback } from "react";
import { Tool, ToolProps } from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { hookMemo } from "src/mento/hookMemo";
import { hooks } from "src/mento/hooks";
import { memoizeProps } from "src/mento/memoize";
import { useAt } from "src/util/immutable-react";
import { updateF } from "src/util/updateF";
import { useContextMenu } from "src/util/useContextMenu";
import { MyContextMenu, MyContextMenuHeading } from "src/view/MyContextMenu";


export type Program = {
  toolName: 'slider',
  value: number,
  min: number,
  max: number,
  step: number,
}

export const tool: Tool<Program> = {
  programFactory: () => ({
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

    const view = hookMemo(() => ({
      render: () => <View {...props} />
    }), [props]);

    return { outputP, view };
  })),
};

const View = memo((props: ToolProps<Program>) => {
  const { program, updateProgram } = props;

  const [ min, , setMin ] = useAt(program, updateProgram, 'min');
  const [ max, , setMax ] = useAt(program, updateProgram, 'max');
  const [ step, , setStep ] = useAt(program, updateProgram, 'step');

  const { openMenu, menuNode } = useContextMenu(useCallback((closeMenu) =>
    <MyContextMenu>
      <MyContextMenuHeading>Slider</MyContextMenuHeading>
      <div>
        <input type='number' value={min} onChange={(ev) => setMin(+ev.target.value)} /> min
      </div>
      <div>
        <input type='number' value={max} onChange={(ev) => setMax(+ev.target.value)} /> max
      </div>
      <div>
        <input type='number' value={step} onChange={(ev) => setStep(+ev.target.value)} /> step
      </div>
    </MyContextMenu>
  , [min, max, step, setMin, setMax, setStep]));

  return <div style={{padding: 10}} onContextMenu={openMenu}>
    {menuNode}
    <input
      type="range"
      value={program.value}
      onChange={(e) => updateProgram(updateF({ value: {$set: +e.target.value }}))}
      min={program.min} max={program.max} step={program.step}/>
    {' '}
    <div style={{display: 'inline-block', width: 30, textAlign: "right"}}>{program.value}</div>
  </div>;
});


import { memo, useCallback, useMemo } from "react";
import { ProgramFactory, ToolProps } from "src/tools-framework/tools";
import { useOutput, useView } from "src/tools-framework/useSubTool";
import { updateKeys, useAt } from "src/util/state";
import { useContextMenu } from "src/util/useContextMenu";
import { useMemoObject } from "src/util/useMemoObject";
import { MyContextMenu, MyContextMenuHeading } from "src/view/MyContextMenu";
import TangleText1 from "./react-tangle";
import tangleCss from "./react-tangle.css";

const TangleText = TangleText1 as any;

export interface Program {
  toolName: 'tangle';
  value: number;
  min: number;
  max: number;
  step: number;
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'tangle',
  value: 0,
  min: -10,
  max: 10,
  step: 1,
});

export const Component = memo((props: ToolProps<Program>) => {
  const { program, reportOutput, reportView } = props;

  useOutput(reportOutput, useMemoObject({
    value: program.value
  }));

  useView(reportView, useMemo(() => ({
    render: () => <View {...props} />,
    // inline: true,
  }), [props]));

  return null;
})

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

  return <div style={{display: 'inline-block', padding: 0, borderBottom: '1px dotted #000'}} onContextMenu={openMenu}>
    <style>{tangleCss}</style>
    {menuNode}
    <TangleText
      value={program.value}
      onInput={(value: number) => updateKeys(updateProgram, { value })}
      min={min} max={max} step={step}/>
  </div>;
});


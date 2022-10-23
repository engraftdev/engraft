import { memo, useMemo } from "react";
import { hasValue, ProgramFactory, ToolProgram, ToolProps } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { Program as CheckboxProgram } from "./checkbox";
import { slotSetTo } from "./slot";

export type Program = {
  toolName: 'hider',
  shownProgram: ToolProgram,
  actualProgram: ToolProgram,
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => ({
  toolName: 'hider',
  shownProgram: slotSetTo<CheckboxProgram>({
    toolName: 'checkbox',
    checked: true,
  }),
  actualProgram: slotSetTo(defaultCode || ''),
});

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [shownComponent, shownView, shownOutput] = useSubTool({program, updateProgram, subKey: 'shownProgram'});
  const isShown = hasValue(shownOutput) && !!shownOutput.value;

  const [actualComponent, actualView, actualOutput] = useSubTool({program, updateProgram, subKey: 'actualProgram'});
  useOutput(reportOutput, actualOutput);


  useView(reportView, useMemo(() => ({
    render: ({autoFocus}) =>
      <div className="xCol xGap10 xPad10">
        <div className="xRow xGap10">
          <b>shown?</b>
          <ShowView view={shownView} />
        </div>
        {isShown &&
          <ShowView view={actualView} />
        }
      </div>
  }), [actualView, shownView, isShown]));

  return <>
    {shownComponent}
    {actualComponent}
  </>
});

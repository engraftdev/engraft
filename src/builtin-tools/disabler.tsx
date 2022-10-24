import { memo, useMemo } from "react";
import { hasValue, ProgramFactory, ToolProgram, ToolProps, ToolView } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { useStateSetOnly } from "src/util/state";
import { slotSetTo } from "./slot";
import { Program as CheckboxProgram } from "./checkbox";

export type Program = {
  toolName: 'disabler',
  enabledProgram: ToolProgram,
  actualProgram: ToolProgram,
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => ({
  toolName: 'disabler',
  enabledProgram: slotSetTo<CheckboxProgram>({
    toolName: 'checkbox',
    checked: true,
  }),
  actualProgram: slotSetTo(defaultCode || ''),
});

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, varBindings, reportView } = props;

  const [enabledComponent, enabledView, enabledOutput] = useSubTool({program, updateProgram, subKey: 'enabledProgram', varBindings});
  const isEnabled = hasValue(enabledOutput) && !!enabledOutput.value;

  const [actualView, setActualView] = useStateSetOnly<ToolView | null>(null);

  useView(reportView, useMemo(() => ({
    render: ({autoFocus}) =>
      <div className="xCol xGap10 xPad10">
        <div className="xRow xGap10">
          <b>enabled?</b>
          <ShowView view={enabledView} />
        </div>
        {isEnabled &&
          <div className="xRow xGap10">
            <b>actual</b>
            <ShowView view={actualView} />
          </div>
        }
      </div>
  }), [actualView, enabledView, isEnabled]));

  return <>
    {enabledComponent}
    {isEnabled &&
      <ComponentWhenEnabled {...props} reportView={setActualView} />
    }
  </>
});

export const ComponentWhenEnabled = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, varBindings, reportOutput, reportView } = props;

  const [actualComponent, actualView, actualOutput] = useSubTool({program, updateProgram, subKey: 'actualProgram', varBindings});

  useOutput(reportOutput, actualOutput);
  useView(reportView, actualView);

  return <>
    {actualComponent}
  </>
});

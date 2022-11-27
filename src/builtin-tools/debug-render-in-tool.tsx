import { memo, useMemo } from "react";
import { ProgramFactory, ToolProgram, ToolProps } from "src/tools-framework/tools";
import { ShowView, useSubTool, useView } from "src/tools-framework/useSubTool";
import { ToolOutputView } from "src/view/Value";
import { slotSetTo } from "./slot";

export type Program = {
  toolName: 'debug-render-in-tool',
  renderProgram: ToolProgram,
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => ({
  toolName: 'debug-render-in-tool',
  renderProgram: slotSetTo(defaultCode || ''),
});

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, varBindings, reportOutput, reportView } = props;

  // TODO: for extra fun, feed in stuff to the render subtool so it can reportOutput for this tool, etc
  const [renderComponent, renderView, renderOutput] = useSubTool({program, updateProgram, varBindings, subKey: 'renderProgram'});

  useView(reportView, useMemo(() => ({
    render: ({autoFocus}) =>
      <div className="xCol xGap10 xPad10">
        <div className="xRow xGap10">
          <b>render</b>
          <ShowView view={renderView} />
        </div>
        <ToolOutputView toolOutput={renderOutput} displayReactElementsDirectly={true} />
      </div>
  }), [renderView, renderOutput]));

  return <>
    {renderComponent}
  </>
});

import { memo } from "react";
import { useStateSetOnly } from "src/util/state";
import IsolateStyles from "src/view/IsolateStyles";
import { lookUpTool, ToolProps, ToolView, ToolViewRenderProps } from "./tools";
import { ShowView } from "./useSubTool";

type ToolWithViewProps = Omit<ToolProps<any>, 'reportView'> & ToolViewRenderProps;

export const ToolWithView = memo(function ToolWithView({ program, updateProgram, reportOutput, ...rest }: ToolWithViewProps) {
  const [view, setView] = useStateSetOnly<ToolView | null>(null);

  const Tool = lookUpTool(program.toolName);

  return <>
    <Tool.Component program={program} updateProgram={updateProgram} reportOutput={reportOutput} reportView={setView} />
    <IsolateStyles>
      <ShowView view={view} {...rest} />
    </IsolateStyles>
  </>
});

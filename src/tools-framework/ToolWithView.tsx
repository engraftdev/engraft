import { memo } from "react";
import { useStateSetOnly } from "src/util/state";
import IsolateStyles from "src/view/IsolateStyles";
import { lookUpTool, ToolProps, ToolView, ToolViewProps } from "./tools";
import { ShowView } from "./useSubTool";

type ToolWithViewProps = Omit<ToolProps<any>, 'reportView'> & ToolViewProps;

export const ToolWithView = memo(function ToolWithView({ program, updateProgram, reportOutput, ...rest }: ToolWithViewProps) {
  const [view, setView] = useStateSetOnly<ToolView | null>(null);

  const Tool = lookUpTool(program.toolName);

  return <>
    <Tool program={program} updateProgram={updateProgram} reportOutput={reportOutput} reportView={setView} />
    <IsolateStyles>
      <ShowView view={view} {...rest} />
    </IsolateStyles>
  </>
});

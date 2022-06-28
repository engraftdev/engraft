import { memo } from "react";
import { useStateSetOnly } from "src/util/state";
import IsolateStyles from "src/view/IsolateStyles";
import { toolIndex, ToolProps, ToolView, ToolViewProps } from "./tools";
import { ShowView } from "./useSubTool";

type ToolWithViewProps = Omit<ToolProps<any>, 'reportView'> & ToolViewProps;

export const ToolWithView = memo(function ToolWithView({ config, updateConfig, reportOutput, ...rest }: ToolWithViewProps) {
  const [view, setView] = useStateSetOnly<ToolView | null>(null);

  const Tool = toolIndex[config.toolName];

  return <>
    <Tool config={config} updateConfig={updateConfig} reportOutput={reportOutput} reportView={setView} />
    <IsolateStyles>
      <ShowView view={view} {...rest} />
    </IsolateStyles>
  </>
});

import { useStateSetOnly } from "../util/state";
import IsolateStyles from "../view/IsolateStyles";
import { toolIndex, ToolProps, ToolView, ToolViewProps } from "./tools";
import { ShowView } from "./useSubTool";

type ToolWithViewProps = Omit<ToolProps<any>, 'reportView'> & ToolViewProps;

export function ToolWithView({ config, updateConfig, reportOutput, ...rest }: ToolWithViewProps) {
  const [view, setView] = useStateSetOnly<ToolView | null>(null);

  const Tool = toolIndex[config.toolName];

  return <>
    <Tool config={config} updateConfig={updateConfig} reportOutput={reportOutput} reportView={setView} />
    <IsolateStyles>
      <ShowView view={view} {...rest} />
    </IsolateStyles>
  </>
}

import ShadowDOM from "../util/ShadowDOM";
import { useStateSetOnly } from "../util/state";
import RootStyles from "../view/RootStyles";
import { toolIndex, ToolProps, ToolView, ToolViewProps } from "./tools";
import { ShowView } from "./useSubTool";

type ToolWithViewProps = Omit<ToolProps<any>, 'reportView'> & ToolViewProps;

export function ToolWithView({ config, updateConfig, reportOutput, ...rest }: ToolWithViewProps) {
  const [view, setView] = useStateSetOnly<ToolView | null>(null);

  const Tool = toolIndex[config.toolName];

  return <>
    <Tool config={config} updateConfig={updateConfig} reportOutput={reportOutput} reportView={setView} />
    <ShadowDOM>
      <RootStyles/>
      <div className="root">
        <ShowView view={view} {...rest} />
      </div>
    </ShadowDOM>
  </>
}


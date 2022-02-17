import { useStateSetOnly } from "../util/state";
import { toolIndex, ToolProps, ToolView, ToolViewProps } from "./tools";
import CallFunction from '../util/CallFunction';

type ToolWithViewProps = Omit<ToolProps<any>, 'reportView'> & ToolViewProps;

export function ToolWithView({ context, config, updateConfig, reportOutput, ...rest }: ToolWithViewProps) {
  const [view, setView] = useStateSetOnly<ToolView | null>(null);

  const Tool = toolIndex[config.toolName];

  return <>
    <Tool context={context} config={config} updateConfig={updateConfig} reportOutput={reportOutput} reportView={setView} />
    {view && <CallFunction f={() => view(rest)}/>}
  </>
}


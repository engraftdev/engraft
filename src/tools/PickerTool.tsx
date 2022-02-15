import { useEffect, useMemo } from "react";
import FunctionComponent from "../util/FunctionComponent";
import { setKeys, setKeys2 } from "../util/setKeys";
import { registerTool, Tool, ToolConfig, toolIndex, ToolProps, ToolView } from "../tools-framework/tools";
import useStrictState, { subSetter } from "../util/useStrictState";

export interface PickerConfig {
  toolName: 'picker';
  pickedConfig: ToolConfig | undefined;
}
export function PickerTool(props: ToolProps<PickerConfig>) {
  const { context, config, reportConfig, reportOutput, reportView } = props;
  const [pickedView, setPickedView] = useStrictState<ToolView | null>(null);

  useEffect(() => {
    reportView.set(() => {
      let contents;
      if (config.pickedConfig) {
        const onClick = () => {
          reportConfig.update(setKeys2<PickerConfig>({ pickedConfig: undefined }));
        }

        contents = <>
          {pickedView ? <FunctionComponent f={pickedView} /> : <div>No view yet?</div>}
          <button style={{ alignSelf: "flex-end", position: "absolute", left: 8, top: -10, border: '1px solid rgba(0,0,0,0.2)' }} onClick={onClick}>
          ×
          </button>
        </>;
      } else {
        const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
          console.log("onchange");
          const toolName = e.target.value;
          reportConfig.update(setKeys({ pickedConfig: toolIndex[toolName].defaultConfig }));
        }

        contents = <select style={{ alignSelf: "flex-end", position: "absolute", border: 'none', left: 8, top: -10 }} onChange={onChange}>
          <option key="none">
            pick a tool
          </option>
          {Object.keys(toolIndex).map((toolName) =>
            toolName !== 'picker' && <option key={toolName}>
              {toolName}
            </option>
          )}
        </select>
      }

      return <div style={{ display: 'inline-block', minWidth: 100, border: '1px solid #0083', padding: '10px', position: "relative", paddingTop: '15px', marginTop: '15px' }}>
        {contents}
      </div>
    })

    return () => reportView.set(null);
  }, [config.pickedConfig, pickedView, reportConfig, reportView])

  const forwardConfig = useMemo(() => subSetter<PickerConfig, 'pickedConfig'>(reportConfig, 'pickedConfig'), [reportConfig]);

  if (config.pickedConfig) {
    const PickedTool = toolIndex[config.pickedConfig.toolName] as Tool<any> | undefined;

    if (PickedTool) {
      return <PickedTool
        context={context}
        config={config.pickedConfig}
        reportConfig={forwardConfig}
        reportOutput={reportOutput}
        reportView={setPickedView}
      />;
    }
  }

  return null;
}
registerTool(PickerTool, {
  toolName: 'picker',
  pickedConfig: undefined
});

import { useCallback } from "react";
import { registerTool, Tool, ToolConfig, toolIndex, ToolProps, ToolView } from "../tools-framework/tools";
import { ShowView, useView } from "../tools-framework/useSubTool";
import { updateKeys, useAt, useStateSetOnly } from "../util/state";

export interface PickerConfig {
  toolName: 'picker';
  pickedConfig: ToolConfig | undefined;
}
export function PickerTool(props: ToolProps<PickerConfig>) {
  const { config, updateConfig, reportOutput, reportView } = props;
  const [pickedView, setPickedView] = useStateSetOnly<ToolView | null>(null);

  const render = useCallback(() => {
    let contents;
    if (config.pickedConfig) {
      const onClick = () => {
        updateKeys(updateConfig, { pickedConfig: undefined });
      }

      contents = <>
        <ShowView view={pickedView} />
        <button style={{ alignSelf: "flex-end", position: "absolute", left: 8, top: -10, border: '1px solid rgba(0,0,0,0.2)' }} onClick={onClick}>
        ×
        </button>
      </>;
    } else {
      const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        console.log("onchange");
        const toolName = e.target.value;
        updateKeys(updateConfig, { pickedConfig: toolIndex[toolName].defaultConfig() });
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
  }, [config.pickedConfig, pickedView, updateConfig]);
  useView(reportView, render, config);

  const [pickedConfig, updatePickedConfig] = useAt(config, updateConfig, 'pickedConfig');

  if (config.pickedConfig) {
    const PickedTool = toolIndex[config.pickedConfig.toolName] as Tool<any> | undefined;

    if (PickedTool) {
      return <PickedTool
        config={pickedConfig}
        updateConfig={updatePickedConfig}
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

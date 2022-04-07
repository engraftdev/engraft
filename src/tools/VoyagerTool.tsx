import { CreateVoyager, Voyager } from "datavoyager";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { registerTool, ToolConfig, ToolProps, ToolView, ToolViewProps } from "../tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "../tools-framework/useSubTool";
import { useAt } from "../util/state";
import { usePrevious } from "../util/usePrevious";
import { flexCol, flexRow } from "../view/styles";
import { codeConfigSetTo } from "./CodeTool";
import voyagerCss from './VoyagerTool.css';


export interface VoyagerConfig extends ToolConfig {
  toolName: 'voyager';
  inputConfig: ToolConfig;
  spec: unknown;
}

export const VoyagerTool = memo(function VoyagerTool(props: ToolProps<VoyagerConfig>) {
  const { config, updateConfig, reportOutput, reportView } = props;

  const [inputComponent, inputView, inputOutput] = useSubTool({config, updateConfig, subKey: 'inputConfig'})

  const data = useMemo(() => {
    if (inputOutput) {
      const value = inputOutput.toolValue;
      if (value instanceof Array) {
        if (value.length === 0 || value[0] instanceof Object) {
          return inputOutput.toolValue
        }
      }
    }
  }, [inputOutput])

  useOutput(reportOutput, {toolValue: undefined, alreadyDisplayed: true})

  const view: ToolView = useCallback((viewProps) => (
    <VoyagerToolView
      {...props} {...viewProps}
      data={data}
      inputView={inputView}
    />
  ), [data, inputView, props]);
  useView(reportView, view);

  return <>
    {inputComponent}
  </>
});
registerTool<VoyagerConfig>(VoyagerTool, 'voyager', () => {
  return {
    toolName: 'voyager',
    inputConfig: codeConfigSetTo(''),
    spec: undefined,
  };
});


interface VoyagerToolViewProps extends ToolProps<VoyagerConfig>, ToolViewProps {
  data: unknown;
  inputView: ToolView | null;
}

const VoyagerToolView = memo(function VoyagerToolView (props: VoyagerToolViewProps) {
  const { config, updateConfig, autoFocus, data, inputView } = props;

  const [container, setContainer] = useState<HTMLDivElement | null>();
  const [voyagerInstance, setVoyagerInstance] = useState<Voyager | null>();

  const [spec, updateSpec] = useAt(config, updateConfig, 'spec');

  useEffect(() => {
    if (container) {
      const voyagerInstance = CreateVoyager(container, {
        hideFooter: true,
        hideHeader: true,
        showDataSourceSelector: false,
      }, undefined as any);
      setVoyagerInstance(voyagerInstance);

      voyagerInstance.onStateChange((state) => {
        // Load info from instance into state
        updateSpec(() => voyagerInstance.getSpec(false));
      })

      // TODO: is there a way to clean up? shrug
    }
  }, [container, updateSpec]);

  // Load info from state into instance
  const dataPrev = usePrevious(data, undefined);
  const specPrev = usePrevious(spec, undefined);
  useEffect(() => {
    if (!voyagerInstance) { return; }

    const dataChanged = data !== dataPrev && data;
    const specChanged = spec !== specPrev && spec !== voyagerInstance.getSpec(false);

    if (dataChanged || specChanged) {
      if (spec) {
        voyagerInstance.setSpec({...spec as any, data: {values: data}});
        // Not sure why this is necessary, but it is:
        voyagerInstance.updateConfig({
          hideFooter: true,
          hideHeader: true,
          showDataSourceSelector: false,
        })
      } else {
        voyagerInstance.updateData({values: data as any})
      }
    }
  }, [voyagerInstance, data, spec, dataPrev, specPrev])

  return (
    <div style={{padding: 10, ...flexCol(), width: 800}}>
      <div className="VoyagerTool-input-row" style={{marginBottom: 10, ...flexRow(), gap: 10}}>
        <span style={{fontWeight: 'bold'}}>input</span> <ShowView view={inputView} autoFocus={autoFocus} />
      </div>
      <div>
        <style>{voyagerCss}</style>
        <div ref={setContainer}/>
      </div>
    </div>
  );
})

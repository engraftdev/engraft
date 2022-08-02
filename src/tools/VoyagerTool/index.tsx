import { CreateVoyager, Voyager } from "datavoyager";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { registerTool, ToolConfig, ToolProps, ToolView, ToolViewProps } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { useAt } from "src/util/state";
import { usePrevious } from "src/util/usePrevious";
import { codeConfigSetTo } from "src/tools/CodeTool";
import style from './style.css';
import _ from "lodash";
import { useRefForCallback } from "src/util/useRefForCallback";


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

  const specRef = useRefForCallback(spec);

  useEffect(() => {
    if (container) {
      const voyagerInstance = CreateVoyager(container, {
        hideFooter: true,
        hideHeader: true,
        showDataSourceSelector: false,
      }, undefined as any);
      setVoyagerInstance(voyagerInstance);

      const unsubscribe = voyagerInstance.onStateChange((state) => {
        // Load info from instance into state
        console.log("onStateChange", state.shelfPreview.spec === voyagerInstance.getSpec(false))
        const newSpec = voyagerInstance.getSpec(false);
        if (!_.isEqual(specRef.current, newSpec)) {
          console.log("loading info from instance into state", specRef.current, newSpec);
          updateSpec(() => newSpec);
        }
      })

      // TODO: is there a way to clean up? shrug
      return () => {
        unsubscribe();
      }
    }
  }, [container, specRef, updateSpec]);

  // Load info from state into instance
  const dataPrev = usePrevious(data, undefined);
  const specPrev = usePrevious(spec, undefined);
  useEffect(() => {
    if (!voyagerInstance) { return; }

    try {
      const dataChanged = _.isEqual(data, dataPrev) && data;
      const specChanged = _.isEqual(spec, specPrev) && _.isEqual(spec, voyagerInstance.getSpec(false));

      if (dataChanged || specChanged) {
        console.log("loading info from state into instance");
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
    } catch (e) {
      console.error("VoyagerTool:", e);
    }
  }, [voyagerInstance, data, spec, dataPrev, specPrev])

  return (
    <div className="xCol" style={{padding: 10, minWidth: 1000}}>
      <div className="VoyagerTool-input-row xRow xGap10">
        <span style={{fontWeight: 'bold'}}>input</span> <ShowView view={inputView} autoFocus={autoFocus} />
      </div>
      <div>
        <style>{style}</style>
        <div ref={setContainer}/>
      </div>
    </div>
  );
})

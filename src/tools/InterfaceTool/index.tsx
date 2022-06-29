import { createContext, memo, useCallback, useEffect, useMemo, useState } from "react";
import { registerTool, ToolConfig, ToolProps, ToolValue, ToolView, ToolViewProps } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { ErrorBoundary } from "src/util/ErrorBoundary";
import { getById, newId } from "src/util/id";
import { RowToCol } from "src/util/RowToCol";
import { useAt } from "src/util/state";
import useHover from "src/util/useHover";
import { useKeyHeld } from "src/util/useKeyHeld";
import { Value, ValueFrame, ValueOfTool } from "src/view/Value";
import { codeConfigSetTo } from "../CodeTool";
import { InterfaceContext, InterfaceNode, InterfaceNodeView, Selection } from "./interface";


export interface InterfaceConfig extends ToolConfig {
  toolName: 'interface';
  inputConfig: ToolConfig;
}

export const InterfaceTool = memo(function InterfaceTool(props: ToolProps<InterfaceConfig>) {
  const { config, updateConfig, reportOutput, reportView } = props;

  const [inputComponent, inputView, inputOutput] = useSubTool({config, updateConfig, subKey: 'inputConfig'})

  useOutput(reportOutput, {toolValue: {view: null, values: null}, alreadyDisplayed: true})

  const view: ToolView = useCallback((viewProps) => (
    <InterfaceToolView {...props} {...viewProps} inputView={inputView} inputOutput={inputOutput}/>
  ), [props, inputView, inputOutput]);
  useView(reportView, view);

  return <>
    {inputComponent}
  </>
});
registerTool<InterfaceConfig>(InterfaceTool, 'interface', (defaultInput) => {
  return {
    toolName: 'interface',
    inputConfig: codeConfigSetTo(defaultInput || ''),
  };
});

interface InterfaceToolViewProps extends ToolProps<InterfaceConfig>, ToolViewProps {
  inputView: ToolView | null;
  inputOutput: ToolValue | null;
}

const InterfaceToolView = memo(function InterfaceToolView(props: InterfaceToolViewProps) {
  const { config, updateConfig, autoFocus, inputView, inputOutput } = props;

  const [ selection, setSelection ] = useState<Selection | null>(null);

  const rootNode: InterfaceNode = {
    type: 'div',
    id: 'root',
    style: {},
    children: [
    ],
  }

  return (
    <div className="xCol xGap10 xPad10">
      <div className="xRow xGap10">
        <b>input</b>
        <ShowView view={inputView} />
      </div>
      { inputOutput &&
        <div className="xRow xGap10">
          <div
            className="xCol xGap10"
            style={{
              width: 100,
              flexShrink: 0,
              flexGrow: 0,
            }}
          >
            <b>selected node</b>
            { selection
              ? <SelectionInspector selection={selection} rootNode={rootNode} />
              : <span>none</span>
            }
            {/*  */}

          </div>
          <ErrorBoundary>
            <InterfaceContext.Provider
              value={{
                editMode: true,
                selection,
                setSelection,
              }}
            >
              <InterfaceNodeView data={inputOutput.toolValue} node={rootNode}/>
            </InterfaceContext.Provider>
          </ErrorBoundary>
          <ErrorBoundary>
            <InterfaceContext.Provider
              value={{
                editMode: false,
              }}
            >
              <InterfaceNodeView data={inputOutput.toolValue} node={rootNode}/>
            </InterfaceContext.Provider>
          </ErrorBoundary>
        </div>
      }
    </div>
  );
})


interface SelectionInspectorProps {
  selection: Selection,
  rootNode: InterfaceNode,
}

const SelectionInspector = memo(function SelectionInspector(props: SelectionInspectorProps) {
  const { selection, rootNode } = props;

  const selectedNode: InterfaceNode | undefined = useMemo(() => {
    console.log(rootNode, selection.id);
    return getById(rootNode, selection.id);
  }, [rootNode, selection.id]);

  return (
    <div className="xCol xGap10">
      <div style={{fontSize: "50%", fontStyle: 'italic'}}>{selection.id}</div>
      <div>
        {selectedNode ? selectedNode.type : 'cannot find node'}
      </div>
      <ValueFrame outerStyle={{ minHeight: 0, maxHeight: 100, display: 'flex', margin: 0 }}>
        <Value value={selection.data} />
      </ValueFrame>
    </div>
  )
});

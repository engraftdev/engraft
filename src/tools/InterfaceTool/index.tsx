import { CSSProperties, Fragment, memo, useCallback, useEffect, useMemo, useState } from "react";
import { registerTool, ToolConfig, ToolProps, ToolValue, ToolView, ToolViewProps } from "src/tools-framework/tools";
import { ToolWithView } from "src/tools-framework/ToolWithView";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { ErrorBoundary } from "src/util/ErrorBoundary";
import { getById, updateById } from "src/util/id";
import { Updater, useAt, useStateSetOnly, useStateUpdateOnly } from "src/util/state";
import { Value } from "src/view/Value";
import { codeConfigSetTo } from "../CodeTool";
import { InterfaceContext, InterfaceNode, InterfaceNodeView, Selection } from "./interface";


export interface InterfaceConfig extends ToolConfig {
  toolName: 'interface';
  inputConfig: ToolConfig;
  rootNode: InterfaceNode;
}

export const InterfaceTool = memo(function InterfaceTool(props: ToolProps<InterfaceConfig>) {
  const { config, updateConfig, reportOutput, reportView } = props;

  const [inputComponent, inputView, inputOutput] = useSubTool({config, updateConfig, subKey: 'inputConfig'})

  const output = useMemo(() => {
    if (!inputOutput) return null;

    return {
      toolValue: {
        view: (
          <InterfaceContext.Provider value={{ editMode: false }} >
            <InterfaceNodeView data={inputOutput.toolValue} node={config.rootNode}/>
          </InterfaceContext.Provider>
        ),
        values: null
      },
      alreadyDisplayed: true
    };
  }, [config.rootNode, inputOutput])
  useOutput(reportOutput, output)

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
    rootNode: {
      id: 'root',
      type: 'element',
      tag: 'div',
      style: {},
      children: [],
    },
  };
});

interface InterfaceToolViewProps extends ToolProps<InterfaceConfig>, ToolViewProps {
  inputView: ToolView | null;
  inputOutput: ToolValue | null;
}

const InterfaceToolView = memo(function InterfaceToolView(props: InterfaceToolViewProps) {
  const { config, updateConfig, autoFocus, inputView, inputOutput } = props;

  const [ selection, setSelection ] = useState<Selection | null>(null);

  const [ rootNode, updateRootNode ] = useAt(config, updateConfig, 'rootNode');

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
              width: 200,
              flexShrink: 0,
              flexGrow: 0,
            }}
          >
            { selection
              ? <SelectionInspector selection={selection} updateRootNode={updateRootNode} />
              : <span>none</span>
            }
          </div>
          <div
            className="xCol xGap10"
            style={{
              width: 300,
            }}
          >
            <b>edit view</b>
            <ErrorBoundary>
              <InterfaceContext.Provider
                value={{
                  editMode: true,
                  selection,
                  setSelection,
                  realize: (node: InterfaceNode) => node,
                }}
              >
                <InterfaceNodeView data={inputOutput.toolValue} node={rootNode}/>
              </InterfaceContext.Provider>
            </ErrorBoundary>
          </div>
          <div
            className="xCol xGap10"
            style={{
              width: 300,
            }}
          >
            <b>run view</b>
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
        </div>
      }
    </div>
  );
})


interface SelectionInspectorProps {
  selection: Selection,
  updateRootNode: Updater<InterfaceNode>,
}

const SelectionInspector = memo(function SelectionInspector(props: SelectionInspectorProps) {
  const { selection, updateRootNode } = props;

  const realize = selection.realize;

  return <Fragment key={selection.node.id}>
    <div className="xCol xGap10">
      {realize &&
        <>
          <button onClick={() => updateRootNode(realize)}>realize</button>
        </>
      }
      <b>type</b>
      <div>
        {selection.node.type}
      </div>
      { selection.node.type === 'element' &&
        <SelectionInspectorForElement {...props} />
      }
      { selection.node.type === 'text' &&
        <SelectionInspectorForText {...props} />
      }
      <b>data</b>
      <Value value={selection.data} />
      <b>debug</b>
      <Value value={selection.node} />
    </div>
  </Fragment>
});

const SelectionInspectorForElement = memo(function SelectionInspectorForElement(props: SelectionInspectorProps) {
  const { selection, updateRootNode } = props;

  const node = selection.node as InterfaceNode & {type: 'element'};

  const realize = selection.realize;

  const onChangeTag = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateRootNode((rootNode) => {
      if (realize) { rootNode = realize(rootNode); }
      rootNode = updateById(rootNode, node.id, (node: InterfaceNode & {type: 'element'}) => ({
        ...node,
        tag: e.target.value,
      }));
      return rootNode;
    });
  }, [node.id, realize, updateRootNode]);

  const [styleConfig, updateStyleConfig] = useStateUpdateOnly(codeConfigSetTo(''))
  const [styleOutput, setStyleOutput] = useStateSetOnly<ToolValue | null>(null)

  useEffect(() => {
    if (styleOutput?.toolValue) {
      console.log("running!", styleOutput.toolValue);
      updateRootNode((rootNode) => {
        if (realize) { rootNode = realize(rootNode); }
        rootNode = updateById(rootNode, node.id, (node: InterfaceNode & {type: 'element'}) => ({
          ...node,
          style: styleOutput.toolValue as CSSProperties,
        }));
        return rootNode;
      });
    }
  }, [node.id, realize, styleOutput, updateRootNode]);

  return <>
    <b>tag</b>
    <div>
      <select value={node.tag} onChange={onChangeTag}>
        <option value="div">div</option>
        <option value="h1">h1</option>
        <option value="h2">h2</option>
        <option value="h3">h3</option>
      </select>
    </div>
    <b>style</b>
    <ToolWithView config={styleConfig} updateConfig={updateStyleConfig} reportOutput={setStyleOutput}/>
  </>;
});


const SelectionInspectorForText = memo(function SelectionInspectorForText(props: SelectionInspectorProps) {
  const { selection, updateRootNode } = props;

  const node = selection.node as InterfaceNode & {type: 'text'};

  const realize = selection.realize;

  const onChangeRawHtml = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateRootNode((rootNode) => {
      if (realize) { rootNode = realize(rootNode); }
      rootNode = updateById(rootNode, node.id, (node: InterfaceNode & {type: 'text'}) => ({
        ...node,
        rawHtml: e.target.checked,
      }));
      return rootNode;
    });
  }, [node.id, realize, updateRootNode]);

  return <>
    <b>raw html?</b>
    <div>
      <input type="checkbox" checked={node.rawHtml} onChange={onChangeRawHtml} />
    </div>
  </>;
});

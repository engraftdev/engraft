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
        <ShowView view={inputView} autoFocus={autoFocus} />
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
              ? <SelectionInspector key={selection.node.id} selection={selection} rootNode={rootNode} updateRootNode={updateRootNode} />
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
  rootNode: InterfaceNode,
  updateRootNode: Updater<InterfaceNode>,
}

const SelectionInspector = memo(function SelectionInspector(props: SelectionInspectorProps) {
  const { selection, rootNode, updateRootNode } = props;

  // TODO: selection is a total mess, cuz it's not updated when the node changes. this is a shortcut for now
  const nodeInTree: InterfaceNode | undefined = getById(rootNode, selection.node.id);
  const node = nodeInTree || selection.node;
  const realize = nodeInTree ? undefined : selection.realize;  // if the node is realized already, don't offer an option to realize it
  let betterSelection = { ...selection, node, realize };
  let betterProps = { ...props, selection: betterSelection };

  return (
    <div className="xCol xGap10" style={{position: 'relative'}}>
      <b>type</b>
      <div>
        {node.type}
      </div>
      { node.type === 'element' &&
        <SelectionInspectorForElement {...betterProps} node={node}/>
      }
      { node.type === 'text' &&
        <SelectionInspectorForText {...betterProps} node={node}/>
      }
      <b>data</b>
      <Value value={selection.data} />
      <b>debug</b>
      <Value value={node} />
      { realize &&
        <div
          style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', backgroundColor: '#f4f4f4', opacity: '50%', cursor: 'pointer'}}
          onClick={() => { updateRootNode(realize); } }
        />
      }
    </div>
  )
});

const SelectionInspectorForElement = memo(function SelectionInspectorForElement(props: SelectionInspectorProps & { node: InterfaceNode & {type: 'element'} }) {
  const { selection, updateRootNode, node } = props;

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

  const [styleConfig, updateStyleConfig] = useStateUpdateOnly(codeConfigSetTo(JSON.stringify(node.style)));
  const [styleOutput, setStyleOutput] = useStateSetOnly<ToolValue | null>(null)

  useEffect(() => {
    if (styleOutput?.toolValue) {
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


const SelectionInspectorForText = memo(function SelectionInspectorForText(props: SelectionInspectorProps & { node: InterfaceNode & {type: 'text'} }) {
  const { selection, updateRootNode, node } = props;

  const realize = selection.realize;

  const onChangeRawHtml = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateRootNode((rootNode) => {
      if (realize) { console.log("realize!"); rootNode = realize(rootNode); }
      console.log("onChangeRawHtml, old root node is", rootNode);
      rootNode = updateById(rootNode, node.id, (node: InterfaceNode & {type: 'text'}) => ({
        ...node,
        rawHtml: e.target.checked,
      }));
      console.log("onChangeRawHtml, new root node is", rootNode);
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

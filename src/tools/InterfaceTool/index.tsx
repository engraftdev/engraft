import { CSSProperties, memo, useCallback, useEffect, useMemo, useState } from "react";
import { registerTool, ToolConfig, ToolProps, ToolValue, ToolView, ToolViewProps } from "src/tools-framework/tools";
import { ToolWithView } from "src/tools-framework/ToolWithView";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { Details } from "src/util/Details";
import { getById, updateById } from "src/util/id";
import { Updater, useAt, useStateSetOnly, useStateUpdateOnly } from "src/util/state";
import { updateF } from "src/util/updateF";
import { Value } from "src/view/Value";
import { codeConfigSetTo } from "../CodeTool";
import { InterfaceContext, InterfaceElement, InterfaceElementOf, InterfaceNode, InterfaceNodeView, renderElementToNode } from "./interface";

import builtinStyles from './builtin.css';

export interface InterfaceConfig extends ToolConfig {
  toolName: 'interface';
  inputConfig: ToolConfig;
  rootElement: InterfaceElement;
}

export const InterfaceTool = memo(function InterfaceTool(props: ToolProps<InterfaceConfig>) {
  const { config, updateConfig, reportOutput, reportView } = props;

  const [inputComponent, inputView, inputOutput] = useSubTool({config, updateConfig, subKey: 'inputConfig'})

  const output = useMemo(() => {
    if (!inputOutput) return null;

    try {
      const renderedNode = renderElementToNode(config.rootElement, inputOutput.toolValue, '', false);

      return {
        toolValue:
          // TODO: package this with control values, stuff like that
          <InterfaceContext.Provider value={{ editMode: false }} >
            <style>{builtinStyles}</style>
            <InterfaceNodeView node={renderedNode}/>
          </InterfaceContext.Provider>,
        alreadyDisplayed: true
      };
    } catch (e) {
      return null;
    }
  }, [config.rootElement, inputOutput])
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
    rootElement: {
      id: 'root',
      type: 'element',
      tag: 'div',
      style: {},
      className: '',
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

  const [ selectedNodeId, setSelectedNodeId ] = useState<string | null>(null);

  const [ rootElement, updateRootElement ] = useAt(config, updateConfig, 'rootElement');

  const rootNodeWithoutGhosts = useMemo(() => {
    try {
      return renderElementToNode(rootElement, inputOutput?.toolValue, '', false);
    } catch {
      return null;
    }
  }, [rootElement, inputOutput]);

  const rootNodeWithGhosts = useMemo(() => {
    try {
      return renderElementToNode(rootElement, inputOutput?.toolValue, '', true);
    } catch {
      return null;
    }
  }, [rootElement, inputOutput]);

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
            { selectedNodeId && rootNodeWithGhosts
              ? <SelectionInspector
                  key={selectedNodeId}
                  selectedNodeId={selectedNodeId}
                  rootElement={rootElement}
                  updateRootElement={updateRootElement}
                  rootNode={rootNodeWithGhosts}
                />
              : <span>none</span>
            }
          </div>
          <div
            className="xCol xGap10"
            style={{
              flex: 1,
            }}
          >
            <b>edit view</b>
            { rootNodeWithGhosts
              ? <InterfaceContext.Provider
                  value={{
                    editMode: true,
                    selectedNodeId,
                    setSelectedNodeId,
                  }}
                >
                  <style>{builtinStyles}</style>
                  <InterfaceNodeView node={rootNodeWithGhosts}/>
                </InterfaceContext.Provider>
              : <span>error</span>
            }
          </div>
          <div
            className="xCol xGap10"
            style={{
              flex: 1,
            }}
          >
            <b>run view</b>
            { rootNodeWithoutGhosts
              ? <InterfaceContext.Provider
                  value={{
                    editMode: false,
                  }}
                >
                  <style>{builtinStyles}</style>
                  <InterfaceNodeView node={rootNodeWithoutGhosts}/>
                </InterfaceContext.Provider>
              : <span>error</span>
            }
          </div>
        </div>
      }
    </div>
  );
})


interface SelectionInspectorProps {
  selectedNodeId: string,
  rootElement: InterfaceElement,
  updateRootElement: Updater<InterfaceElement>,
  rootNode: InterfaceNode,
}

const SelectionInspector = memo(function SelectionInspector(props: SelectionInspectorProps) {
  const { selectedNodeId, updateRootElement, rootNode } = props;

  const node: InterfaceNode | undefined = getById(rootNode, selectedNodeId);
  if (!node) {
    return <span>error: node cannot be found</span>
  }

  const { element, ghostInfo } = node;

  return (
    <div className="xCol xGap10" style={{position: 'relative'}}>
      <b>type</b>
      <div>
        {element.type}
      </div>
      { element.type === 'element' &&
        <SelectionInspectorForElement {...props} node={node}/>
      }
      { element.type === 'text' &&
        <SelectionInspectorForText {...props} node={node}/>
      }
      <b>debug</b>
      <Details summary='node'>
        <Value value={node} />
      </Details>

      { ghostInfo &&
        <div
          style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', backgroundColor: '#f4f4f4', opacity: '50%', cursor: 'pointer'}}
          onClick={() => { updateRootElement(ghostInfo.realize); } }
        />
      }
    </div>
  )
});

const SelectionInspectorForElement = memo(function SelectionInspectorForElement(props: SelectionInspectorProps & { node: InterfaceNode }) {
  const { updateRootElement, node } = props;

  const element = node.element as InterfaceElementOf<'element'>;

  const onChangeTag = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    // TODO: lol, three different meanings to 'update' here...
    // 1. imperative function which takes an update function and performs it onto state
    // 2. pure function which takes an input and returns an output
    // 3. pure function which returns a function
    updateRootElement((rootElement) =>
      updateById<InterfaceElementOf<'element'>>(rootElement, element.id,
        updateF({tag: {$set: e.target.value}})
      )
    );
  }, [element.id, updateRootElement]);

  const [styleConfig, updateStyleConfig] = useStateUpdateOnly(codeConfigSetTo(JSON.stringify(element.style)));
  const [styleOutput, setStyleOutput] = useStateSetOnly<ToolValue | null>(null)

  useEffect(() => {
    if (styleOutput?.toolValue) {
      updateRootElement((rootElement) =>
        updateById<InterfaceElementOf<'element'>>(rootElement, element.id,
          updateF({style: {$set: styleOutput.toolValue as CSSProperties}})
        )
      );
    }
  }, [element.id, styleOutput, updateRootElement]);

  const onChangeClasses = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateRootElement((rootElement) =>
      updateById<InterfaceElementOf<'element'>>(rootElement, element.id,
        updateF({className: {$set: e.target.value}})
      )
    );
  }, [element.id, updateRootElement]);

  return <>
    <b>tag</b>
    <div>
      <select value={element.tag} onChange={onChangeTag}>
        <option value="div">div</option>
        <option value="h1">h1</option>
        <option value="h2">h2</option>
        <option value="h3">h3</option>
      </select>
    </div>
    <b>style</b>
    <ToolWithView config={styleConfig} updateConfig={updateStyleConfig} reportOutput={setStyleOutput}/>
    <b>classes</b>
    <input value={element.className} onChange={onChangeClasses}/>
  </>;
});


const SelectionInspectorForText = memo(function SelectionInspectorForText(props: SelectionInspectorProps & { node: InterfaceNode }) {
  const { updateRootElement, node } = props;

  const element = node.element as InterfaceElement & { type: 'text' };

  const onChangeRawHtml = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateRootElement((rootElement) =>
      updateById<InterfaceElementOf<'text'>>(rootElement, element.id,
        updateF({rawHtml: {$set: e.target.checked}})
      )
    );
  }, [element.id, updateRootElement]);

  return <>
    <b>raw html?</b>
    <div>
      <input type="checkbox" checked={element.rawHtml} onChange={onChangeRawHtml} />
    </div>
  </>;
});

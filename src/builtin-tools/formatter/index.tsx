import update from 'immutability-helper';
import { CSSProperties, memo, useCallback, useEffect, useMemo, useState } from "react";
import { hasValue, ProgramFactory, ToolOutput, ToolProgram, ToolProps, ToolView, ToolViewRenderProps, valueOrUndefined } from "src/tools-framework/tools";
import { ToolWithView } from "src/tools-framework/ToolWithView";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { Details } from "src/util/Details";
import { findAllNested, findNested, getById, newId, updateById } from "src/util/id";
import { Updater, useAt, useStateSetOnly, useStateUpdateOnly } from "src/util/state";
import { updateF } from "src/util/updateF";
import { Value } from "src/view/Value";
import { slotSetTo } from "../slot";
import { ControlValues, FormatterContext, FormatterElement, FormatterElementOf, FormatterNode, FormatterNodeView, renderElementToNode } from "./elements-and-nodes";

import builtinStyles from './builtin.css';

export type Program = {
  toolName: 'formatter';
  inputProgram: ToolProgram;
  rootElement: FormatterElement;
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => {
  return {
    toolName: 'formatter',
    inputProgram: slotSetTo(defaultCode || ''),
    rootElement: {
      id: 'root',
      type: 'element',
      tag: 'div',
      style: {},
      className: '',
      children: [],
    },
  };
};

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [inputComponent, inputView, inputOutput] = useSubTool({program, updateProgram, subKey: 'inputProgram'})

  const [controlValues, updateControlValues] = useStateUpdateOnly<ControlValues>({});

  const [rootElement, _updateRootElement] = useAt(program, updateProgram, 'rootElement');

  const rootNodeWithoutGhosts = useMemo(() => {
    try {
      return renderElementToNode(rootElement, valueOrUndefined(inputOutput), '', false);
    } catch (e) {
      console.warn('error generating rootNodeWithoutGhosts', e);
      return null;
    }
  }, [rootElement, inputOutput]);

  const rootNodeWithGhosts = useMemo(() => {
    try {
      return renderElementToNode(rootElement, valueOrUndefined(inputOutput), '', true);
    } catch (e) {
      console.warn('error generating rootNodeWithGhosts', e);
      return null;
    }
  }, [rootElement, inputOutput]);

  useEffect(() => {
    if (!rootNodeWithoutGhosts) {
      return;
    }

    // construct "defaultValues" shape by scanning all nodes
    const defaultValues: ControlValues = {};
    const controlNodes = findAllNested(rootNodeWithoutGhosts, (obj: unknown) => {
      if (obj && typeof obj === 'object' && (obj as any).element?.type === 'control') {
        return true;
      }
    }) as FormatterNode[];
    for (const node of controlNodes) {
      const element = node.element as FormatterElement & {type: 'control'};
      if (!defaultValues[element.name]) {
        defaultValues[element.name] = {};
      }
      if (node.controlKey) {
        defaultValues[element.name][node.controlKey] = {checkbox: false, text: ''}[element.controlType];
      }
    }

    updateControlValues((oldValues) => matchShape(oldValues, defaultValues));
  }, [rootNodeWithoutGhosts, updateControlValues]);

  useOutput(reportOutput, useMemo(() => {
    if (!hasValue(inputOutput)) return null;

    try {
      const renderedNode = renderElementToNode(program.rootElement, inputOutput.value, '', false);
      const view = (
        <FormatterContext.Provider value={{ controlValues, updateControlValues, editMode: false }} >
          <style>{builtinStyles}</style>
          <FormatterNodeView node={renderedNode}/>
        </FormatterContext.Provider>
      );

      return {
        value: {
          view,
          controlValues,
        },
      };
    } catch (e) {
      console.warn('error generating output', e);
      return null;
    }
  }, [program.rootElement, controlValues, inputOutput, updateControlValues]))

  useView(reportView, useMemo(() => ({
    render: (viewProps) =>
      <View
        {...props} {...viewProps}
        inputView={inputView} inputOutput={inputOutput}
        rootNodeWithGhosts={rootNodeWithGhosts}
        controlValues={controlValues} updateControlValues={updateControlValues}
      />
  }), [props, inputView, inputOutput, rootNodeWithGhosts, controlValues, updateControlValues]));

  return <>
    {inputComponent}
  </>
});

// here, "shape" is expected to be a nested object-of-objects with default values at the bottom
//   (like `false` and `''`)
// we add and remove elements from `data` to make it match the shape
// and return the new value
function matchShape(data: any, shape: any): any {
  if (typeof data !== 'object' || typeof shape !== 'object') {
    console.warn('matchShape: data and shape must be objects', data, shape);
    throw new Error('can only match shapes of objects');
  }

  // for keys in data...
  for (const key of Object.keys(data)) {
    if (!(key in shape)) {
      // if not in shape, remove them
      data = update(data, {$unset: [key]});
    } else {
      // if in shape & is object, recurse
      if (typeof shape[key] === 'object') {
        const childData = matchShape(data[key], shape[key]);
        if (childData !== data[key]) {
          data = update(data, {[key]: {$set: childData}});
        }
      }
    }
  }

  // for keys in shape...
  for (const key of Object.keys(shape)) {
    if (!(key in data)) {
      // if not in data, add them
      data = update(data, {[key]: {$set: shape[key]}});
    }
  }

  return data;
}

type ViewProps = ToolProps<Program> & ToolViewRenderProps & {
  inputView: ToolView | null,
  inputOutput: ToolOutput | null,
  rootNodeWithGhosts: FormatterNode | null,
  controlValues: ControlValues,
  updateControlValues: Updater<ControlValues>,
}

const View = memo(function FormatterToolView(props: ViewProps) {
  const { program, updateProgram, autoFocus, inputView, inputOutput, rootNodeWithGhosts, controlValues, updateControlValues } = props;

  const [ selectedNodeId, setSelectedNodeId ] = useState<string | null>(null);

  const [ rootElement, updateRootElement ] = useAt(program, updateProgram, 'rootElement');

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
            {/* <b>edit view</b> */}
            { rootNodeWithGhosts
              ? <FormatterContext.Provider
                  value={{
                    controlValues, updateControlValues,
                    editMode: true,
                    selectedNodeId,
                    setSelectedNodeId,
                  }}
                >
                  <style>{builtinStyles}</style>
                  <FormatterNodeView node={rootNodeWithGhosts}/>
                </FormatterContext.Provider>
              : <span>error</span>
            }
          </div>
        </div>
      }
    </div>
  );
})


type SelectionInspectorProps = {
  selectedNodeId: string,
  rootElement: FormatterElement,
  updateRootElement: Updater<FormatterElement>,
  rootNode: FormatterNode,
}

const SelectionInspector = memo(function SelectionInspector(props: SelectionInspectorProps) {
  const { selectedNodeId, updateRootElement, rootNode, rootElement } = props;

  const node: FormatterNode | undefined = getById(rootNode, selectedNodeId);

  const onClickInsertBelowCheckbox = useCallback(() => {
    const parentElement = findNested(rootElement, (obj) => {
      if (obj && typeof obj === 'object' && 'children' in obj) {
        return (obj as any).children.some((child: any) => child.id === node!.element.id);
      }
    }) as FormatterElementOf<'element'> | undefined;
    if (!parentElement) {
      throw new Error("parent not found");
    }
    const idx = parentElement.children.indexOf(node!.element);
    const checkboxElement: FormatterElement = {
      id: newId(),
      type: 'control',
      controlType: 'checkbox',
      name: 'control 1',  // TODO: generate names
      keyFuncCode: '(data) => "key"',
    };
    updateRootElement((rootElement) =>
      updateById<FormatterElementOf<'element'>>(rootElement, parentElement.id,
        updateF({children: {$splice: [[idx+1, 0, checkboxElement]]}})
      )
    );
  }, [node, rootElement, updateRootElement])

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
      { element.type === 'control' &&
        <SelectionInspectorForControl {...props} node={node}/>
      }
      <b>insert below...</b>
      <button onClick={onClickInsertBelowCheckbox}>checkbox</button>
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

const SelectionInspectorForElement = memo(function SelectionInspectorForElement(props: SelectionInspectorProps & { node: FormatterNode }) {
  const { updateRootElement, node } = props;

  const element = node.element as FormatterElementOf<'element'>;

  const onChangeTag = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    // TODO: lol, three different meanings to 'update' here...
    // 1. imperative function which takes an update function and performs it onto state
    // 2. pure function which takes an input and returns an output
    // 3. pure function which returns a function
    updateRootElement((rootElement) =>
      updateById<FormatterElementOf<'element'>>(rootElement, element.id,
        updateF({tag: {$set: e.target.value}})
      )
    );
  }, [element.id, updateRootElement]);

  const [styleProgram, updateStyleProgram] = useStateUpdateOnly(slotSetTo(JSON.stringify(element.style)));
  const [styleOutput, setStyleOutput] = useStateSetOnly<ToolOutput | null>(null)

  useEffect(() => {
    if (hasValue(styleOutput)) {
      updateRootElement((rootElement) =>
        updateById<FormatterElementOf<'element'>>(rootElement, element.id,
          updateF({style: {$set: styleOutput.value as CSSProperties}})
        )
      );
    }
  }, [element.id, styleOutput, updateRootElement]);

  const onChangeClasses = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateRootElement((rootElement) =>
      updateById<FormatterElementOf<'element'>>(rootElement, element.id,
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
    <ToolWithView program={styleProgram} updateProgram={updateStyleProgram} reportOutput={setStyleOutput}/>
    <b>classes</b>
    <input value={element.className} onChange={onChangeClasses}/>
  </>;
});


const SelectionInspectorForText = memo(function SelectionInspectorForText(props: SelectionInspectorProps & { node: FormatterNode }) {
  const { updateRootElement, node } = props;

  const element = node.element as FormatterElement & { type: 'text' };

  const onChangeRawHtml = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateRootElement((rootElement) =>
      updateById<FormatterElementOf<'text'>>(rootElement, element.id,
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


const SelectionInspectorForControl = memo(function SelectionInspectorForControl(props: SelectionInspectorProps & { node: FormatterNode }) {
  const { updateRootElement, node } = props;

  const element = node.element as FormatterElement & { type: 'control' };

  const onChangeName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateRootElement((rootElement) =>
      updateById<FormatterElementOf<'control'>>(rootElement, element.id,
        updateF({name: {$set: e.target.value}})
      )
    );
  }, [element.id, updateRootElement]);

  const onChangeKeyFuncCode = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateRootElement((rootElement) =>
      updateById<FormatterElementOf<'control'>>(rootElement, element.id,
        updateF({keyFuncCode: {$set: e.target.value}})
      )
    );
  }, [element.id, updateRootElement]);

  return <>
    <b>control name</b>
    <div>
      <input type="text" value={element.name} onChange={onChangeName} />
    </div>
    <b>control key function</b>
    <div>
      <input type="text" value={element.keyFuncCode} onChange={onChangeKeyFuncCode} />
    </div>
  </>;
});

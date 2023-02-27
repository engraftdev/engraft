import { memo, useCallback, useMemo, useState } from "react";
import { ComputeReferences, ProgramFactory, references, ToolOutput, ToolProgram, ToolProps, ToolResult, ToolRun, ToolView, ToolViewRenderProps } from "../../engraft";
import { Details } from "../../util/Details";
import { getById, updateById } from "../../util/id";
import { Value } from "../../view/Value";
import { slotSetTo } from "../slot";
import { FormatterContext, FormatterElement, FormatterElementOf, FormatterNode, FormatterNodeView, renderElementToNode } from "./elements-and-nodes";
import { EngraftPromise } from '../../engraft/EngraftPromise';
import { usePromiseState } from '../../engraft/EngraftPromise.react';
import { hookRunTool } from '../../engraft/hooks';
import { ShowView } from '../../engraft/ShowView';
import { hookMemo } from '../../incr/hookMemo';
import { hooks } from '../../incr/hooks';
import { memoizeProps } from '../../incr/memoize';
import { UpdateProxy } from '../../util/UpdateProxy';
import { useUpdateProxy } from '../../util/UpdateProxy.react';
import builtinStyles from './builtin.css?inline';

// TODO: The old version of formatter supported (the beginnings of) controls.
// That's stripped out in this version, but we should get back into that someday.

// TODO: Style in the inspector too.

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

export const computeReferences: ComputeReferences<Program> = (program) =>
  references(program.inputProgram);

export const run: ToolRun<Program> = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings } = props;
  const inputResult = hookRunTool({ program: program.inputProgram, varBindings })

  const outputP: EngraftPromise<ToolOutput> = hookMemo(() => inputResult.outputP.then((inputOutput) => {
    const renderedNode = renderElementToNode(program.rootElement, inputOutput.value, '', false);
    const view = (
      <FormatterContext.Provider value={{ editMode: false }} >
        <style>{builtinStyles}</style>
        <FormatterNodeView node={renderedNode}/>
      </FormatterContext.Provider>
    );

    return {
      value: {
        view,
      },
    };
  }), [inputResult.outputP, program.rootElement]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: (viewProps) =>
      <View
        {...props} {...viewProps}
        inputResult={inputResult}
      />
  }), [props, inputResult]);

  return {outputP, view};
}));

type ViewProps = ToolProps<Program> & ToolViewRenderProps<Program> & {
  inputResult: ToolResult,
}

const View = memo(function FormatterToolView(props: ViewProps) {
  const { program, updateProgram, autoFocus, inputResult } = props;
  const programUP = useUpdateProxy(updateProgram);
  const { rootElement } = program;

  const [ selectedNodeId, setSelectedNodeId ] = useState<string | null>(null);

  const rootNodeWithGhostsP = useMemo(() => inputResult.outputP.then((inputOutput) => {
    return renderElementToNode(rootElement, inputOutput.value, '', true);
  }), [inputResult.outputP, rootElement])
  const rootNodeWithGhostsState = usePromiseState(rootNodeWithGhostsP);

  return (
    <div className="xCol xGap10 xPad10">
      <div className="xRow xGap10">
        <b>input</b>
        <ShowView view={inputResult.view} updateProgram={programUP.inputProgram.$} autoFocus={autoFocus} />
      </div>
      { rootNodeWithGhostsState.status === 'fulfilled' &&
        <div className="xRow xGap10">
          <div
            className="xCol xGap10"
            style={{
              width: 200,
              flexShrink: 0,
              flexGrow: 0,
            }}
          >
            { selectedNodeId
              ? <SelectionInspector
                  key={selectedNodeId}
                  selectedNodeId={selectedNodeId}
                  rootElementUP={programUP.rootElement}
                  rootNode={rootNodeWithGhostsState.value}
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
            { <FormatterContext.Provider
                value={{
                  editMode: true,
                  selectedNodeId,
                  setSelectedNodeId,
                }}
              >
                <style>{builtinStyles}</style>
                <FormatterNodeView node={rootNodeWithGhostsState.value}/>
              </FormatterContext.Provider>
            }
          </div>
        </div>
      }
    </div>
  );
})


type SelectionInspectorProps = {
  selectedNodeId: string,
  rootElementUP: UpdateProxy<FormatterElement>,
  rootNode: FormatterNode,
}

const SelectionInspector = memo(function SelectionInspector(props: SelectionInspectorProps) {
  const { selectedNodeId, rootElementUP, rootNode } = props;

  const node: FormatterNode | undefined = getById(rootNode, selectedNodeId);

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
          onClick={() => { rootElementUP.$apply(ghostInfo.realize); } }
        />
      }
    </div>
  )
});

const SelectionInspectorForElement = memo(function SelectionInspectorForElement(props: SelectionInspectorProps & { node: FormatterNode }) {
  const { rootElementUP, node } = props;

  const element = node.element as FormatterElementOf<'element'>;

  const onChangeTag = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    rootElementUP.$apply((rootElement) =>
      updateById<FormatterElementOf<'element'>>(rootElement, element.id,
        (old) => ({...old, tag: e.target.value})
      )
    )
  }, [element.id, rootElementUP]);

  const onChangeClasses = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    rootElementUP.$apply((rootElement) =>
      updateById<FormatterElementOf<'element'>>(rootElement, element.id,
        (old) => ({...old, className: e.target.value})
      )
    );
  }, [element.id, rootElementUP]);

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
    <b>classes</b>
    <input value={element.className} onChange={onChangeClasses}/>
  </>;
});


const SelectionInspectorForText = memo(function SelectionInspectorForText(props: SelectionInspectorProps & { node: FormatterNode }) {
  const { rootElementUP, node } = props;

  const element = node.element as FormatterElement & { type: 'text' };

  const onChangeRawHtml = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    rootElementUP.$apply((rootElement) =>
      updateById<FormatterElementOf<'text'>>(rootElement, element.id,
        (old) => ({...old, rawHtml: e.target.checked})
      )
    );
  }, [element.id, rootElementUP]);

  return <>
    <b>raw html?</b>
    <div>
      <input type="checkbox" checked={element.rawHtml} onChange={onChangeRawHtml} />
    </div>
  </>;
});

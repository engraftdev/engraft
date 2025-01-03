import { ToolWithView } from "@engraft/hostkit";
import { noOp } from "@engraft/shared/lib/noOp.js";
import { CollectReferences, defineTool, EngraftContext, EngraftPromise, hookMemo, hookRunTool, hooks, inputFrameBarBackdrop, InputHeading, MakeProgram, memoizeProps, renderWithReact, ShowView, ToolOutput, ToolProgram, ToolProps, ToolResult, ToolRun, ToolView, ToolViewRenderProps, up, UpdateProxy, usePromiseState } from "@engraft/toolkit";
import { memo, useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import builtinStyles from './builtin.css.js';
import { FormatterContext, FormatterElement, FormatterElementOf, FormatterNode, FormatterNodeView, FormatterSelection, makeVarBindingsForData, renderElementToNode } from "./elements-and-nodes.js";
import { getById, updateById } from "./id.js";

// TODO: The old version of formatter supported (the beginnings of) controls.
// That's stripped out in this version, but we should get back into that someday.

// TODO: Style in the inspector too.

type Program = {
  toolName: 'formatter';
  inputProgram: ToolProgram;
  rootElement: FormatterElement;
}

const makeProgram: MakeProgram<Program> = (context, defaultCode?: string) => {
  return {
    toolName: 'formatter',
    inputProgram: context.makeSlotWithCode(defaultCode || ''),
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

const collectReferences: CollectReferences<Program> = (program) => program.inputProgram;

const run: ToolRun<Program> = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings, context } = props;
  const inputResult = hookRunTool({ program: program.inputProgram, varBindings, context })

  const outputP: EngraftPromise<ToolOutput> = hookMemo(() => inputResult.outputP.then((inputOutput) => {
    const renderedNode = renderElementToNode(program.rootElement, inputOutput.value, '', false);
    const view = (
      <FormatterContext.Provider value={{ editMode: false }} >
        <style>{builtinStyles}</style>
        <FormatterNodeView node={renderedNode} engraftContext={context} />
      </FormatterContext.Provider>
    );

    return {
      value: view,
    };
  }), [context, inputResult.outputP, program.rootElement]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: renderWithReact((viewProps) =>
      <View
        {...props} {...viewProps}
        inputResult={inputResult}
      />
    ),
  }), [props, inputResult]);

  return {outputP, view};
}));

export default defineTool({ name: 'formatter', makeProgram, collectReferences, run })

type ViewProps = ToolProps<Program> & ToolViewRenderProps<Program> & {
  inputResult: ToolResult,
}

const View = memo(function FormatterToolView(props: ViewProps) {
  const { program, updateProgram, context, autoFocus, frameBarBackdropElem, inputResult } = props;
  const programUP = up(updateProgram);
  const { rootElement } = program;

  const [ selection, setSelection ] = useState<FormatterSelection | null>(null);

  const rootNodeWithGhostsP = useMemo(() => inputResult.outputP.then((inputOutput) => {
    return renderElementToNode(rootElement, inputOutput.value, '', true);
  }), [inputResult.outputP, rootElement])
  const rootNodeWithGhostsState = usePromiseState(rootNodeWithGhostsP);

  return (
    <div className="xCol">
      {frameBarBackdropElem && createPortal(inputFrameBarBackdrop, frameBarBackdropElem)}
      <InputHeading
        slot={<ShowView view={inputResult.view} updateProgram={programUP.inputProgram.$} autoFocus={autoFocus} />}
      />
      { rootNodeWithGhostsState.status === 'fulfilled' && selection &&
        <div
          className="xCol xGap10 xPad10"
          style={{
            flexShrink: 0,
            flexGrow: 0,
            position: 'sticky',
            top: 0,
            boxShadow: '0 2px 2px 1px rgba(0,0,0,0.1)',
            background: 'white',
            zIndex: 1,
          }}
        >
          <SelectionInspector
            key={selection.nodeId}
            selectedNodeId={selection.nodeId}
            rootElementUP={programUP.rootElement}
            rootNode={rootNodeWithGhostsState.value}
            context={context}
          />
        </div>
      }
      { rootNodeWithGhostsState.status === 'fulfilled' &&
        <div
          className="xPad10"
          onClick={() => setSelection(null)}
        >
          <style>{builtinStyles}</style>
          <FormatterContext.Provider
            value={{
              editMode: true,
              selection,
              setSelection,
            }}
          >
            <FormatterNodeView node={rootNodeWithGhostsState.value} engraftContext={context} />
          </FormatterContext.Provider>
        </div>
      }
    </div>
  );
})


type SelectionInspectorProps = {
  selectedNodeId: string,
  rootElementUP: UpdateProxy<FormatterElement>,
  rootNode: FormatterNode,
  context: EngraftContext,
}

const SelectionInspector = memo(function SelectionInspector(props: SelectionInspectorProps) {
  const { selectedNodeId, rootElementUP, rootNode } = props;

  const node: FormatterNode | undefined = getById(rootNode, selectedNodeId);

  if (!node) {
    return <span>error: node cannot be found</span>
  }

  const { element, ghostInfo } = node;

  if (ghostInfo) {
    return (
      <button
        onClick={() => { rootElementUP.$apply(ghostInfo.realize); } }
      >
        add to output
      </button>
    )
  }

  return (
    <div className="xRow xGap20">
      <div className="xCol xGap10">
        <b>type</b>
        <div>
          {element.type}
        </div>
      </div>
      { element.type === 'element' &&
        <SelectionInspectorForElement {...props} node={node}/>
      }
      { element.type === 'text' &&
        <SelectionInspectorForText {...props} node={node}/>
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
    <div className="xCol xGap10">
      <b>tag</b>
      <div>
        <select value={element.tag} onChange={onChangeTag}>
          <option value="div">div</option>
          <option value="h1">h1</option>
          <option value="h2">h2</option>
          <option value="h3">h3</option>
        </select>
      </div>
    </div>
    <div className="xCol xGap10">
      <b>classes</b>
      <input value={element.className} onChange={onChangeClasses}/>
    </div>
  </>;
});


const SelectionInspectorForText = memo(function SelectionInspectorForText(props: SelectionInspectorProps & { node: FormatterNode }) {
  const { rootElementUP, node, context } = props;

  const element = node.element as FormatterElement & { type: 'text' };

  const varBindings = useMemo(() => makeVarBindingsForData(node.innerData), [node.innerData]);

  const showAs = element.formatProgram ? 'custom' : element.rawHtml ? 'html' : 'text';
  const setShowAs = useCallback((showAs: 'text' | 'html' | 'custom') => {
    rootElementUP.$apply((rootElement) =>
      updateById<FormatterElementOf<'text'>>(rootElement, element.id,
        (old) => {
          if (showAs === 'text') {
            return {...old, rawHtml: false, formatProgram: undefined};
          } else if (showAs === 'html') {
            return {...old, rawHtml: true, formatProgram: undefined};
          } else if (showAs === 'custom') {
            if (old.formatProgram) {
              return old;
            } else {
              return {...old, rawHtml: false, formatProgram: context.makeSlotWithCode('IDdata000000')};
            }
          } else {
            throw new Error('unreachable');
          }
        }
      )
    )
  }, [context, element.id, rootElementUP]);

  return <>
    <div className="xCol xGap10">
      <b>show as</b>
      <select
        value={showAs}
        onChange={(ev) => setShowAs(ev.target.value as any)}
      >
        <option value="text">text</option>
        <option value="html">html</option>
        <option value="custom">custom...</option>
      </select>
    </div>
    { element.formatProgram &&
      <div className="xCol xGap10">
        <b>program</b>
        <div>
          {/* TODO: ToolWithView shouldn't be used inside tools */}
          <ToolWithView
            program={element.formatProgram}
            varBindings={varBindings}
            context={context}
            updateProgram={(newProgram) => {
              rootElementUP.$apply((rootElement) =>
                updateById<FormatterElementOf<'text'>>(rootElement, element.id,
                  (old) => ({...old, formatProgram: newProgram(old.formatProgram)})
                )
              );
            }}
            reportOutputState={noOp}
          />
        </div>
      </div>
    }
  </>;
});

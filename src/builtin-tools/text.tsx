import { autocompletion } from "@codemirror/autocomplete";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { memo, useCallback, useContext, useMemo } from "react";
import ReactDOM from "react-dom";
import { VarBindingsContext, ProgramFactory, Tool, ToolProgram, ToolProps, ToolOutput, ToolView, ToolViewRenderProps, VarBinding, VarBindings, hasValue } from "src/tools-framework/tools";
import { ShowView, useOutput, useView } from "src/tools-framework/useSubTool";
import CodeMirror from "src/util/CodeMirror";
import { refCompletions, setup, SubTool, toolCompletions } from "src/util/codeMirrorStuff";
import { newId } from "src/util/id";
import { usePortalSet } from "src/util/PortalSet";
import refsExtension, { refCode } from "src/util/refsExtension";
import { updateKeys, useAt, useStateUpdateOnly } from "src/util/state";
import { useMemoObject } from "src/util/useMemoObject";
import { useRefForCallback } from "src/util/useRefForCallback";
import IsolateStyles from "src/view/IsolateStyles";
import { VarUse } from "src/view/Vars";
import { slotSetTo } from "./slot";

export interface Program {
  toolName: 'text';
  text: string;
  subTools: {[id: string]: ToolProgram};
}

export const programFactory: ProgramFactory<Program> = () => {
  return {
    toolName: 'text',
    text: '',
    subTools: {},
  };
};

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [subToolPrograms, updateSubToolPrograms] = useAt(program, updateProgram, 'subTools');

  const varBindings = useContext(VarBindingsContext)

  const [views, updateViews] = useStateUpdateOnly<{[id: string]: ToolView | null}>({});
  const [outputs, updateOutputs] = useStateUpdateOnly<{[id: string]: ToolOutput | null}>({});

  const replacedText = useMemo(() => {
    let result = program.text;
    const applyReplacement = ([k, v]: readonly [string, ToolOutput | null]) => {
      try {
        let replacementText = '';
        if (hasValue(v)) {
          const toolValue = v.value;
          if (typeof toolValue === 'object' && toolValue) {
            replacementText = toolValue.toString();
          }
          replacementText = "" + toolValue;
        }
        result = result.replaceAll(refCode(k), replacementText);
      } catch {
        // ignore
      }
    }
    Object.entries(varBindings).map(([k, v]) => [k, v.output || null] as const).forEach(applyReplacement);
    Object.entries(outputs).forEach(applyReplacement);
    return result;
  }, [program.text, varBindings, outputs])

  useOutput(reportOutput, useMemoObject({
    value: replacedText
  }));

  useView(reportView, useMemo(() => ({
    render: (viewProps) =>
      <TextToolView
        {...props} {...viewProps}
        views={views}
        varBindings={varBindings}
      />
  }), [varBindings, props, views]));

  return <>
    {Object.entries(subToolPrograms).map(([id, subToolProgram]) =>
      <SubTool key={id} id={id} subToolPrograms={subToolPrograms}
              updateSubToolPrograms={updateSubToolPrograms} updateOutputs={updateOutputs} updateViews={updateViews} />
    )}
  </>;
})


interface TextToolViewProps extends ToolProps<Program>, ToolViewRenderProps {
  views: {[id: string]: ToolView | null};
  varBindings: VarBindings;
}

const TextToolView = memo(function TextToolView(props: TextToolViewProps) {
  const { program, updateProgram, autoFocus, views, varBindings } = props;

  const [, updateSubToolPrograms] = useAt(program, updateProgram, 'subTools');
  const [text, updateText] = useAt(program, updateProgram, 'text');

  const [refSet, refs] = usePortalSet<{id: string}>();

  const varBindingsRef = useRefForCallback(varBindings);
  const extensions = useMemo(() => {
    function insertTool(tool: Tool<ToolProgram>) {
      const id = newId();
      const newProgram = slotSetTo(tool.programFactory());
      updateKeys(updateSubToolPrograms, {[id]: newProgram});
      // TODO: we never remove these! lol
      return id;
    };
    const completions = [
      toolCompletions(insertTool),
      refCompletions(() => varBindingsRef.current)
    ];
    return [...setup, refsExtension(refSet), markdown(), autocompletion({override: completions}), EditorView.lineWrapping];
  }, [varBindingsRef, refSet, updateSubToolPrograms])

  const onChange = useCallback((value: string) => {
    updateText(() => value);
  }, [updateText]);

  // return <div style={{display: 'inline-block', minWidth: 20, border: '1px solid #0083'}}>

  return <>
    <CodeMirror
      extensions={extensions}
      autoFocus={autoFocus}
      text={text}
      onChange={onChange}
    />
    {refs.map(([elem, {id}]) => {
      return ReactDOM.createPortal(
        views[id] ?
          <IsolateStyles style={{display: 'inline-block'}}>
            <ShowView view={views[id]} autoFocus={true}/>
          </IsolateStyles> :
          <VarUse varBinding={varBindings[id] as VarBinding | undefined} />,
        elem
      )
    })}
  </>;
})

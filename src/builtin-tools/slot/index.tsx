import { BabelFileResult } from '@babel/core';
import { transform } from '@babel/standalone';
import { autocompletion } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from '@codemirror/view';
import _ from 'lodash';
import { memo, ReactNode, useCallback, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { cN } from 'src/deps';
import { ProgramFactory, Tool, ToolOutput, ToolProgram, ToolProps, ToolView, ToolViewRenderProps, valueOrUndefined, VarBinding, VarBindings } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import CodeMirror from "src/util/CodeMirror";
import { refCompletions, setup, SubTool, toolCompletions } from "src/util/codeMirrorStuff";
import { compileExpression } from "src/util/compile";
import { newId } from "src/util/id";
import { usePortalSet } from "src/util/PortalSet";
import { makeRand } from 'src/util/rand';
import refsExtension, { refCode, refRE } from "src/util/refsExtension";
import { Replace, updateKeys, Updater, useAt, useStateSetOnly, useStateUpdateOnly } from "src/util/state";
import { useDedupe } from 'src/util/useDedupe';
import { useRefForCallback } from "src/util/useRefForCallback";
import IsolateStyles from "src/view/IsolateStyles";
import { ToolFrame } from "src/view/ToolFrame";
import { VarUse } from "src/view/Vars";
import { globals } from './globals';

export type Program = ProgramCodeMode | ProgramToolMode;

interface ProgramShared {
  toolName: 'slot',
  // defaultCode says that whoever made this SlotTool thought this would be a nice code for it.
  // * So, if we switch TO tool-mode, we will provide this as the default input for the tool.
  // * And if we switch FROM tool-mode, we will provide this as the default code again.
  // * Q: Should this be defaultCode or defaultInputProgram?
  defaultCode: string | undefined,
}

interface ProgramCodeMode extends ProgramShared {
  modeName: 'code',
  code: string,
  subTools: {[id: string]: ToolProgram},
}

interface ProgramToolMode extends ProgramShared {
  modeName: 'tool',
  subProgram: ToolProgram,
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => ({
  toolName: 'slot',
  modeName: 'code',
  defaultCode,
  code: '',
  subTools: {},
});

export const Component = memo((props: ToolProps<Program>) => {
  const {program, updateProgram} = props;

  if (program.modeName === 'code') {
    return <CodeMode {...props} program={program} updateProgram={updateProgram as Updater<Program, ProgramCodeMode>} />;
  } else {
    return <ToolMode {...props} program={program} updateProgram={updateProgram as Updater<Program, ProgramToolMode>} />;
  }
})


// Some notes about slotSetTo:
// * Right now, this is the only reasonable way to make a tool of ANY sort. Why? It provides the
//   ToolFrame, and with it, the ability to switch out of the given tool into a different one.
export function slotSetTo<P extends ToolProgram | string>(program: P): Program {
  // TODO: this is a hack, isn't it? (the program.toolName === 'slot' part, I mean)
  if (typeof program !== 'string' && program.toolName === 'slot') {
    return program as Program;
  }

  return {
    toolName: 'slot',
    ...(typeof program === 'string' ?
        { modeName: 'code', code: program, subTools: {}, defaultCode: program }:
        { modeName: 'tool', subProgram: program, defaultCode: undefined }
    )
  };
}


export function summarizeSlotProgram(program: Program): ReactNode {
  if (program.modeName === 'code') {
    return <pre>{program.code.replaceAll(refRE, '_')}</pre>;
  } else {
    return program.subProgram.toolName;
  }
}


///////////////
// CODE MODE //
///////////////

let _transformCachedCache: {[code: string]: BabelFileResult} = {};
function transformCached(code: string) {
  const fromCache = _transformCachedCache[code]
  if (fromCache) { return fromCache; }
  const computed = transform(code, { presets: ["react"] });
  _transformCachedCache[code] = computed;
  return computed;
}

type CodeModeProps = Replace<ToolProps<Program>, {
  program: ProgramCodeMode,
  updateProgram: Updater<Program, ProgramCodeMode>,
}>

const CodeMode = memo(function CodeMode(props: CodeModeProps) {
  const { program, updateProgram, varBindings, reportOutput, reportView} = props;

  const compiled = useMemo(() => {
    if (program.code === '') {
      return null;
    }

    try {
      // TODO: better treatment of non-expression code (multiple lines w/return, etc)
      let translated = transformCached("(" + program.code + ")").code!;
      translated = translated.replace(/;$/, "");
      const result = compileExpression(translated);
      return result;
    } catch (e) {
      return {error: (e as any).toString()};
    }
  }, [program.code])

  const [subToolPrograms, updateSubToolPrograms] = useAt(program, updateProgram, 'subTools');
  const [views, updateViews] = useStateUpdateOnly<{[id: string]: ToolView | null}>({});
  const [outputs, updateOutputs] = useStateUpdateOnly<{[id: string]: ToolOutput | null}>({});

  // TODO: should this be useMemo? issues with async, huh?
  const [output, setOutput] = useStateSetOnly<ToolOutput | null>(null);
  useEffect(() => {
    if (compiled === null) {
      setOutput(null);
      return;
    }

    if ('error' in compiled) {
      setOutput({error: compiled.error});
    } else {
      const rand = makeRand();
      const scope = {
        ...Object.fromEntries(Object.entries(varBindings).map(([k, v]) => [refCode(k), valueOrUndefined(v.output)])),
        ...Object.fromEntries(Object.entries(outputs).map(([k, v]) => [refCode(k), valueOrUndefined(v)])),
        ...globals,
        rand
      };
      try {
        const result = compiled(scope);
        if (result instanceof Promise) {
          result.then((value) => {
            setOutput({value: value});
          })
        } else {
          setOutput({value: result});
        }
      } catch (e) {
        // console.warn("error with", program.code)
        // console.warn(e);
        setOutput({error: (e as any).toString()});
      }
    }
  }, [compiled, varBindings, outputs, setOutput])
  useOutput(reportOutput, useDedupe(output, _.isEqual));

  useView(reportView, useMemo(() => ({
    render: (viewProps) =>
      <CodeModeView
        {...props} {...viewProps}
        updateSubToolPrograms={updateSubToolPrograms}
        views={views}
      />
  }), [props, updateSubToolPrograms, views]));

  return <>
    {Object.entries(subToolPrograms).map(([id, subToolProgram]) =>
      <SubTool key={id} id={id} subToolPrograms={subToolPrograms} varBindings={varBindings}
               updateSubToolPrograms={updateSubToolPrograms} updateOutputs={updateOutputs} updateViews={updateViews} />
    )}
  </>;
});

interface CodeModeViewProps extends CodeModeProps, ToolViewRenderProps {
  updateSubToolPrograms: Updater<{[id: string]: ToolProgram}>;
  views: {[id: string]: ToolView | null};
  varBindings: VarBindings;
}

const CodeModeView = memo(function CodeModeView(props: CodeModeViewProps) {
  const {expand, program, updateProgram, autoFocus, updateSubToolPrograms, views, varBindings} = props;
  const varBindingsRef = useRefForCallback(varBindings);

  const [refSet, refs] = usePortalSet<{id: string}>();

  const extensions = useMemo(() => {
    function insertTool(tool: Tool) {
      const id = newId();
      const newProgram = slotSetTo(tool.programFactory());
      updateKeys(updateSubToolPrograms, {[id]: newProgram});
      // TODO: we never remove these! lol
      return id;
    };
    function replaceWithTool(tool: Tool) {
      // console.log('replaceWithTool', program.defaultInput, tool.defaultProgram(program.defaultInput));
      updateProgram(() => ({toolName: 'slot', modeName: 'tool', subProgram: tool.programFactory(program.defaultCode), defaultCode: program.defaultCode}))
    };
    const completions = [
      toolCompletions(insertTool, replaceWithTool),
      refCompletions(() => varBindingsRef.current),
    ];
    return [
      ...setup,
      refsExtension(refSet),
      javascript({jsx: true}),
      autocompletion({override: completions}),
      EditorView.domEventHandlers({
        paste(event, view) {
          const text = event.clipboardData?.getData('text');
          if (text) {
            try {
              const parsed = JSON.parse(text);
              if (parsed.toolName) {
                // TODO: for now, we just replace – someday we should check about insertions
                updateProgram(() => slotSetTo(parsed));
                event.preventDefault();
              }
            } catch {

            }
          }
        }
      }),
    ];
  }, [program.defaultCode, varBindingsRef, refSet, updateProgram, updateSubToolPrograms])

  const onChange = useCallback((value: string) => {
    updateKeys(updateProgram, {code: value});
  }, [updateProgram]);

  const contents = <>
    <CodeMirror
      extensions={extensions}
      autoFocus={autoFocus}
      text={program.code}
      onChange={onChange}
    />
    {refs.map(([elem, {id}]) => {
      return ReactDOM.createPortal(
        views[id] ?
          <IsolateStyles style={{display: 'inline-block'}}>
            <ShowView view={views[id]} autoFocus={true}/>
          </IsolateStyles> :
          <VarUse key={id} varBinding={varBindings[id] as VarBinding | undefined} />,
        elem
      )
    })}
  </>

  return (
    <div
      className={cN('CodeModeView', {xWidthFitContent: !expand})}
      style={{display: 'inline-block', minWidth: 20, border: '1px solid #0083', boxSizing: 'border-box', maxWidth: '100%'}}
    >
      {contents}
    </div>
  );
});



///////////////
// TOOL MODE //
///////////////

type ToolModeProps = Replace<ToolProps<Program>, {
  program: ProgramToolMode,
  updateProgram: Updater<Program, ProgramToolMode>,
}>

const ToolMode = memo(function ToolMode({ program, varBindings, reportOutput, reportView, updateProgram}: ToolModeProps) {

  const [component, toolView, output] = useSubTool({ program, updateProgram, subKey: 'subProgram', varBindings })

  useOutput(reportOutput, output);

  const [subProgram, updateSubProgram] = useAt(program, updateProgram, 'subProgram');

  const onCloseFrame = useCallback(() => {
    updateProgram(() => ({
      toolName: 'slot',
      modeName: 'code',
      code: program.defaultCode || '',
      subTools: {},
      defaultCode: program.defaultCode,
    }));
  }, [program.defaultCode, updateProgram]);

  useView(reportView, useMemo(() => ({
    render: ({autoFocus, expand, noFrame}) =>
      noFrame
      ? <ShowView view={toolView} autoFocus={autoFocus} />
      : <ToolFrame
          expand={expand}
          program={subProgram} updateProgram={updateSubProgram} varBindings={varBindings}
          onClose={onCloseFrame}
        >
          {/* <div style={{ minWidth: 100, padding: '10px', position: "relative"}}> */}
            <ShowView view={toolView} autoFocus={autoFocus} />
          {/* </div> */}
        </ToolFrame>
  }), [subProgram, updateSubProgram, varBindings, onCloseFrame, toolView]));

  return component;
});

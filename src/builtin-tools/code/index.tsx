import { BabelFileResult } from '@babel/core';
import { transform } from '@babel/standalone';
import { autocompletion } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from '@codemirror/view';
import { memo, ReactNode, useCallback, useContext, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import seedrandom from 'seedrandom';
import { EnvContext, PossibleEnvContext, PossibleVarBindings, ProgramFactory, Tool, ToolProgram, ToolProps, ToolValue, ToolView, ToolViewProps, VarBinding, VarBindings } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import CodeMirror from "src/util/CodeMirror";
import { refCompletions, setup, SubTool, toolCompletions } from "src/util/codeMirrorStuff";
import { compileExpression } from "src/util/compile";
import { newId } from "src/util/id";
import { usePortalSet } from "src/util/PortalSet";
import refsExtension, { refCode, refRE } from "src/util/refsExtension";
import { Replace, updateKeys, Updater, useAt, useStateSetOnly, useStateUpdateOnly } from "src/util/state";
import { useRefForCallback } from "src/util/useRefForCallback";
import IsolateStyles from "src/view/IsolateStyles";
import { ToolFrame } from "src/view/ToolFrame";
import { VarUse } from "src/view/Vars";
import { globals } from './globals';

export type Program = ProgramCodeMode | ProgramToolMode;

export interface ProgramShared {
  toolName: 'code',
  // defaultCode says that whoever made this CodeTool thought this would be a nice code for it.
  // * So, if we switch TO tool-mode, we will provide this as the default input for the tool.
  // * And if we switch FROM tool-mode, we will provide this as the default code again.
  // * Q: Should this be defaultCode or defaultInputProgram?
  defaultCode: string | undefined,
}

export interface ProgramCodeMode extends ProgramShared {
  modeName: 'code',
  code: string,
  subTools: {[id: string]: ToolProgram},
}

export interface ProgramToolMode extends ProgramShared {
  modeName: 'tool',
  subProgram: ToolProgram,
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => ({
  toolName: 'code',
  modeName: 'code',
  defaultCode,
  code: '',
  subTools: {},
});

export const Component = memo((props: ToolProps<Program>) => {
  const {program, updateProgram} = props;

  if (program.modeName === 'code') {
    return <CodeToolCodeMode {...props} program={program} updateProgram={updateProgram as Updater<Program, ProgramCodeMode>} />;
  } else {
    return <CodeToolToolMode {...props} program={program} updateProgram={updateProgram as Updater<Program, ProgramToolMode>} />;
  }
})


// Some notes about codeProgramSetTo:
// * Right now, this is the only reasonable way to make a tool of ANY sort. Why? It provides the
//   ToolFrame, and with it, the ability to switch out of the given tool into a different one.
export function codeProgramSetTo(program: ToolProgram | string): Program {
  // TODO: this is a hack, isn't it? (the program.toolName === 'code' part, I mean)
  if (typeof program !== 'string' && program.toolName === 'code') {
    return program as Program;
  }

  return {
    toolName: 'code',
    ...(typeof program === 'string' ?
        { modeName: 'code', code: program, subTools: {}, defaultCode: program }:
        { modeName: 'tool', subProgram: program, defaultCode: undefined }
    )
  };
}


export function summarizeCodeProgram(program: Program): ReactNode {
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

type CodeToolCodeModeProps = Replace<ToolProps<Program>, {
  program: ProgramCodeMode,
  updateProgram: Updater<Program, ProgramCodeMode>,
}>

export const CodeToolCodeMode = memo(function CodeToolCodeMode(props: CodeToolCodeModeProps) {
  const { program, updateProgram, reportOutput, reportView} = props;

  const compiled = useMemo(() => {
    try {
      // TODO: better treatment of non-expression code (multiple lines w/return, etc)
      let translated = transformCached("(" + program.code + ")").code!;
      translated = translated.replace(/;$/, "");
      const result = compileExpression(translated);
      return result;
    } catch (e) {
      // console.warn("error with", program.code)
      // console.warn(e);
    }
  }, [program.code])

  // We have to use useContext here, not in the view – the view isn't inside tool context!
  const env = useContext(EnvContext)
  const possibleEnv = useContext(PossibleEnvContext)

  const [subToolPrograms, updateSubToolPrograms] = useAt(program, updateProgram, 'subTools');
  const [views, updateViews] = useStateUpdateOnly<{[id: string]: ToolView | null}>({});
  const [outputs, updateOutputs] = useStateUpdateOnly<{[id: string]: ToolValue | null}>({});

  const [output, setOutput] = useStateSetOnly<ToolValue | null>(null);
  useEffect(() => {
    if (compiled) {
      const rand = seedrandom('live-compose 2022');
      const scope = {
        ...Object.fromEntries(Object.entries(env).map(([k, v]) => [refCode(k), v.value?.toolValue])),
        ...Object.fromEntries(Object.entries(outputs).map(([k, v]) => [refCode(k), v?.toolValue])),
        ...globals,
        rand
      };
      try {
        const result = compiled(scope);
        if (result instanceof Promise) {
          result.then((value) => {
            setOutput({toolValue: value});
          })
        } else {
          setOutput({toolValue: compiled(scope)});
        }
      } catch (e) {
        // console.warn("error with", program.code)
        console.warn(e);
        setOutput(null);
      }
    } else {
      setOutput(null);
    }
  }, [compiled, env, outputs, setOutput])
  useOutput(reportOutput, output);

  const view: ToolView = useCallback((viewProps) => (
    <CodeToolCodeModeView
      {...props} {...viewProps}
      updateSubToolPrograms={updateSubToolPrograms}
      views={views}
      env={env} possibleEnv={possibleEnv}
    />
  ), [env, possibleEnv, props, updateSubToolPrograms, views])
  useView(reportView, view);

  return <>
    {Object.entries(subToolPrograms).map(([id, subToolProgram]) =>
      <SubTool key={id} id={id} subToolPrograms={subToolPrograms}
               updateSubToolPrograms={updateSubToolPrograms} updateOutputs={updateOutputs} updateViews={updateViews} />
    )}
  </>;
});

interface CodeToolCodeModeViewProps extends CodeToolCodeModeProps, ToolViewProps {
  updateSubToolPrograms: Updater<{[id: string]: ToolProgram}>;
  views: {[id: string]: ToolView | null};
  env: VarBindings;
  possibleEnv: PossibleVarBindings;
}

const CodeToolCodeModeView = memo(function CodeToolCodeModeView(props: CodeToolCodeModeViewProps) {
  const {program, updateProgram, autoFocus, updateSubToolPrograms, views, env, possibleEnv} = props;

  const [refSet, refs] = usePortalSet<{id: string}>();

  const envRef = useRefForCallback(env);
  const possibleEnvRef = useRefForCallback(possibleEnv);
  const extensions = useMemo(() => {
    function insertTool(tool: Tool) {
      const id = newId();
      const newProgram = codeProgramSetTo(tool.programFactory());
      updateKeys(updateSubToolPrograms, {[id]: newProgram});
      // TODO: we never remove these! lol
      return id;
    };
    function replaceWithTool(tool: Tool) {
      // console.log('replaceWithTool', program.defaultInput, tool.defaultProgram(program.defaultInput));
      updateProgram(() => ({toolName: 'code', modeName: 'tool', subProgram: tool.programFactory(program.defaultCode), defaultCode: program.defaultCode}))
    };
    const completions = [
      toolCompletions(insertTool, replaceWithTool),
      refCompletions(() => envRef.current, () => possibleEnvRef.current),
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
                updateProgram(() => codeProgramSetTo(parsed));
                event.preventDefault();
              }
            } catch {

            }
          }
        }
      }),
    ];
  }, [program.defaultCode, envRef, possibleEnvRef, refSet, updateProgram, updateSubToolPrograms])

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
          <VarUse key={id} varBinding={env[id] as VarBinding | undefined} />,
        elem
      )
    })}
  </>

  return <div className="xWidthFitContent" style={{display: 'inline-block', minWidth: 20, border: '1px solid #0083', boxSizing: 'border-box', maxWidth: '100%'}}>
    {contents}
  </div>;
});



///////////////
// TOOL MODE //
///////////////

type CodeToolToolModeProps = Replace<ToolProps<Program>, {
  program: ProgramToolMode,
  updateProgram: Updater<Program, ProgramToolMode>,
}>

export const CodeToolToolMode = memo(function CodeToolToolMode({ program, reportOutput, reportView, updateProgram}: CodeToolToolModeProps) {

  const [component, toolView, output] = useSubTool({ program, updateProgram, subKey: 'subProgram' })

  useOutput(reportOutput, output);

  const env = useContext(EnvContext);
  const possibleEnv = useContext(PossibleEnvContext);

  const [subProgram, updateSubProgram] = useAt(program, updateProgram, 'subProgram');

  const view: ToolView = useCallback(({autoFocus}) => (
    <ToolFrame
      program={subProgram} updateProgram={updateSubProgram} env={env} possibleEnv={possibleEnv}
      onClose={() => {
        updateProgram(() => ({
          toolName: 'code',
          modeName: 'code',
          code: program.defaultCode || '',
          subTools: {},
          defaultCode: program.defaultCode,
        }));
      }}
    >
      {/* <div style={{ minWidth: 100, padding: '10px', position: "relative"}}> */}
        <ShowView view={toolView} autoFocus={autoFocus} />
      {/* </div> */}
    </ToolFrame>
  ), [program, env, possibleEnv, subProgram, toolView, updateProgram, updateSubProgram]);
  useView(reportView, view);

  return component;
});

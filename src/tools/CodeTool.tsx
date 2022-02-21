import { ReactNode, useCallback, useContext, useMemo, useRef } from "react";
import { EnvContext, PossibleEnvContext, PossibleVarInfos, registerTool, Tool, ToolConfig, toolIndex, ToolProps, ToolValue, ToolView, VarInfo, VarInfos } from "../tools-framework/tools";
import { javascript } from "@codemirror/lang-javascript";
import { CompletionSource, CompletionContext } from "@codemirror/autocomplete";

import {keymap, highlightSpecialChars, drawSelection, dropCursor, EditorView} from "@codemirror/view"
import {EditorState} from "@codemirror/state"
import {history, historyKeymap} from "@codemirror/history"
import {foldKeymap} from "@codemirror/fold"
import {indentOnInput} from "@codemirror/language"
import {defaultKeymap} from "@codemirror/commands"
import {bracketMatching} from "@codemirror/matchbrackets"
import {closeBrackets, closeBracketsKeymap} from "@codemirror/closebrackets"
import {searchKeymap, highlightSelectionMatches} from "@codemirror/search"
import {autocompletion, completionKeymap, pickedCompletion, Completion} from "@codemirror/autocomplete"
import {commentKeymap} from "@codemirror/comment"
import {rectangularSelection} from "@codemirror/rectangular-selection"
import {defaultHighlightStyle} from "@codemirror/highlight"
import {lintKeymap} from "@codemirror/lint"
import { ShowView, useOutput, useSubTool, useTool, useView } from "../tools-framework/useSubTool";
import { updateKeys, Updater, useAt, useStateUpdateOnly } from "../util/state";
import compile from "../util/compile";
import CodeMirror from "../util/CodeMirror";
import { usePortalSet } from "../util/PortalSet";
import ReactDOM from "react-dom";
import { VarUse } from "../view/Vars";
import WindowPortal from "../util/WindowPortal";
import refsExtension, { refCode } from "../util/refsExtension";
import Value from "../view/Value";
import id from "../util/id";
import CallFunction from "../util/CallFunction";

export type CodeConfig = {
  toolName: 'code';
  mode: CodeConfigCodeMode | CodeConfigToolMode;
}

export interface CodeConfigCodeMode {
  modeName: 'code',
  code: string,
  subTools: {[id: string]: ToolConfig}
}

export interface CodeConfigToolMode {
  modeName: 'tool',
  config: ToolConfig
}

const setup = [
  // lineNumbers(),
  // highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  // foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  defaultHighlightStyle.fallback,
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  // highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...commentKeymap,
    ...completionKeymap,
    ...lintKeymap
  ])
]


function toolCompletions(insertTool: (tool: Tool<any>) => string, replaceWithTool: (tool: Tool<any>) => void): CompletionSource {
  return (completionContext: CompletionContext) => {
    let word = completionContext.matchBefore(/\/?\w*/)!
    if (word.from === word.to && !completionContext.explicit) {
      return null
    }
    return {
      from: word.from,
      options: [
        ...Object.entries(toolIndex).map(([toolName, tool]) => ({
          label: '/' + toolName,
          apply: (view: EditorView, completion: Completion, from: number, to: number) => {
            console.log({from, to, len: view.state.doc.length})
            if (from === 0 && to === view.state.doc.length) {
              replaceWithTool(tool);
            } else {
              const id = insertTool(tool);
              const completionText = refCode(id);
              view.dispatch({
                changes: {from, to, insert: completionText},
                selection: {anchor: from + completionText.length},
                userEvent: "input.complete",
                annotations: pickedCompletion.of(completion)
              });
            }
          }
        })),
      ]
    }
  }
}

function refCompletions(env?: VarInfos, possibleEnv?: PossibleVarInfos): CompletionSource {
  return (completionContext: CompletionContext) => {
    let word = completionContext.matchBefore(/@?\w*/)!
    if (word.from === word.to && !completionContext.explicit) {
      return null
    }
    return {
      from: word.from,
      options: [
        ...Object.values(env || {}).map((varInfo) => ({
          label: '@' + varInfo.config.label,
          apply: refCode(varInfo.config.id),
        })),
        ...Object.values(possibleEnv || {}).map((possibleVarInfo) => ({
          label: '@' + possibleVarInfo.config.label + '?',  // TODO: better signal that it's 'possible'
          apply: (view: EditorView, completion: Completion, from: number, to: number) => {
            let apply = refCode(possibleVarInfo.config.id);
            possibleVarInfo.request();
            view.dispatch({
              changes: {from, to, insert: apply},
              selection: {anchor: from + apply.length},
              userEvent: "input.complete",
              annotations: pickedCompletion.of(completion)
            });
          }
        })),
      ]
    }
  };
}

export function CodeTool(props: ToolProps<CodeConfig>) {
  const {config, updateConfig} = props;

  let [modeConfig, updateModeConfig] = useAt(config, updateConfig, 'mode');

  if (modeConfig.modeName === 'code') {
    return <CodeToolCodeMode {...props} modeConfig={modeConfig} updateModeConfig={updateModeConfig as Updater<CodeConfigCodeMode>} />;
  } else {
    return <CodeToolToolMode {...props} modeConfig={modeConfig} updateModeConfig={updateModeConfig as Updater<CodeConfigToolMode>} />;
  }
}
registerTool(CodeTool, {
  toolName: 'code',
  mode: {
    modeName: 'code',
    code: '',
    subTools: {},
  }
});


export function CodeToolCodeMode({ config, updateConfig, reportOutput, reportView, modeConfig, updateModeConfig}: ToolProps<CodeConfig> &
                                 { modeConfig: CodeConfigCodeMode, updateModeConfig: Updater<CodeConfigCodeMode> }) {
  const compiled = useMemo(() => {
    try {
      const result = compile(modeConfig.code)
      return result;
    } catch {
      // todo
    }
  }, [modeConfig.code])

  const env = useContext(EnvContext)
  const envRef = useRef<VarInfos>();
  envRef.current = env;
  const possibleEnv = useContext(PossibleEnvContext)
  const possibleEnvRef = useRef<PossibleVarInfos>();
  possibleEnvRef.current = possibleEnv;
  // TODO: is the above an appropriate pattern to make a value available from a fixed (user-initiated) callback?


  const [subTools, updateSubTools] = useAt(modeConfig, updateModeConfig, 'subTools');
  const [views, updateViews] = useStateUpdateOnly<{[id: string]: ToolView | null}>({});
  const [outputs, updateOutputs] = useStateUpdateOnly<{[id: string]: ToolValue | null}>({});


  const output = useMemo(() => {
    if (compiled) {
      const wrapped = {
        ...Object.fromEntries(Object.entries(env).map(([k, v]) => [refCode(k), v.value?.toolValue])),
        ...Object.fromEntries(Object.entries(outputs).map(([k, v]) => [refCode(k), v?.toolValue]))
      };
      try {
        return {toolValue: compiled(wrapped)};
      } catch {
      }
    }
    return null;
  }, [compiled, env, outputs])
  useOutput(reportOutput, output);

  const render = useCallback(function R({autoFocus}) {
    const [refSet, refs] = usePortalSet<{id: string}>();

    const extensions = useMemo(() => {
      function insertTool(tool: Tool<ToolConfig>) {
        const newId = id();
        const newConfig = tool.defaultConfig();
        updateKeys(updateSubTools, {[newId]: newConfig});
        // TODO: we never remove these! lol
        return newId;
      };
      function replaceWithTool(tool: Tool<ToolConfig>) {
        updateKeys(updateConfig, {mode: {modeName: 'tool', config: tool.defaultConfig()}});
      };
      const completions = [toolCompletions(insertTool, replaceWithTool), refCompletions(envRef.current, possibleEnvRef.current)];
      return [...setup, refsExtension(refSet), javascript(), autocompletion({override: completions})];
    }, [refSet])

    const onChange = useCallback((value) => {
      updateKeys(updateModeConfig, {code: value});
    }, []);

    // return <div style={{display: 'inline-block', minWidth: 20, border: '1px solid #0083'}}>

    return <ToolFrame config={config} env={env} possibleEnv={possibleEnv}>
      <CodeMirror
        extensions={extensions}
        autoFocus={autoFocus}
        text={modeConfig.code}
        onChange={onChange}
      />
      {refs.map(([elem, {id}]) => {
        return ReactDOM.createPortal(
          subTools[id] ?
            // TODO: this style-resetting is tedious; is there a better way?
            <div style={{all: 'initial', display: 'inline-block'}}>
              <div className="root">
              <ToolFrame config={subTools[id]} env={env} possibleEnv={possibleEnv}>
                <ShowView view={views[id]} />
              </ToolFrame>
              </div>
            </div> :
            <VarUse varInfo={env[id] as VarInfo | undefined} />,
          elem
        )
      })}
    </ToolFrame>;
  }, [config, env, modeConfig.code, possibleEnv, subTools, updateModeConfig, updateSubTools, views])
  useView(reportView, render, config);

  return <>
    {Object.entries(subTools).map(([id, subToolConfig]) =>
      <CallFunction key={id} f={function R() {
        const [subTool, updateSubTool] = useAt(subTools, updateSubTools, id);

        // TODO: CallFunction seems dangerous, in that hook deps might not be maintained correctly?
        // this sure is simple tho!
        const reportOutput = useCallback((output) => updateKeys(updateOutputs, {[id]: output}), []);
        const reportView = useCallback((view) => updateKeys(updateViews, {[id]: view}), []);

        const Tool = toolIndex[subTool.toolName]
        return <Tool
          config={subTool}
          updateConfig={updateSubTool}
          reportOutput={reportOutput}
          reportView={reportView}
        />
      }} />
    )}
  </>;
}


export function CodeToolToolMode({ config, reportOutput, reportView, updateConfig, modeConfig, updateModeConfig}: ToolProps<CodeConfig> &
                                 { modeConfig: CodeConfigToolMode, updateModeConfig: Updater<CodeConfigToolMode> }) {

  const [component, view, output] = useSubTool({
    config: modeConfig,
    updateConfig: updateModeConfig,
    subKey: 'config',
  })

  useOutput(reportOutput, output);

  const env = useContext(EnvContext);
  const possibleEnv = useContext(PossibleEnvContext);

  const render = useCallback(function R({autoFocus}) {
    return <ToolFrame config={modeConfig.config} env={env} possibleEnv={possibleEnv} onClose={() => {updateKeys(updateConfig, {mode: {modeName: 'code', code: '', subTools: {}}});}}>
      <div style={{ minWidth: 100, padding: '10px', position: "relative"}}>
        <ShowView view={view} autoFocus={autoFocus} />
      </div>
    </ToolFrame>
  }, [env, modeConfig.config, possibleEnv, updateConfig, view]);
  useView(reportView, render, config);

  return component;
}

interface ToolFrameProps {
  children: ReactNode;
  config: ToolConfig;
  onClose?: () => void;
  env: VarInfos;
  possibleEnv: PossibleVarInfos;
}

function ToolFrame({children, config, onClose, env, possibleEnv}: ToolFrameProps) {
  const [showInspector, updateShowInspector] = useStateUpdateOnly(false);

  return <div style={{ minWidth: 100, border: '1px solid #0083', position: "relative", display: 'inline-flex', flexDirection: 'column' }}>
    <div style={{height: 15, background: '#e4e4e4', fontSize: 13, color: '#0008', display: 'flex'}}>
      <div style={{marginLeft: 2}}>{config.toolName}</div>
      <div style={{flexGrow: 1}}></div>
      <div style={{background: '#0003', width: 10, height: 10, fontSize: 10, lineHeight: '10px', textAlign: 'center', alignSelf: 'center', cursor: 'pointer', marginRight: 3}}
        onClick={() => {updateShowInspector((i) => !i)}}
      >i</div>
      {onClose &&
        <div style={{background: '#0003', width: 10, height: 10, fontSize: 10, lineHeight: '10px', textAlign: 'center', alignSelf: 'center', cursor: 'pointer', marginRight: 3}}
          onClick={onClose}
        >×</div>
      }
    </div>
    {children}
    {showInspector && <WindowPortal>
      <h3>Tool config</h3>
      <Value value={config}/>
      <h3>Env</h3>
      <Value value={env}/>
      <h3>Possible env</h3>
      <Value value={possibleEnv}/>
    </WindowPortal>}
  </div>;
}
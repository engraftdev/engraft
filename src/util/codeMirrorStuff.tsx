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
import { updateKeys, Updater, useAt, useStateUpdateOnly } from "../util/state";
import { PossibleVarInfos, Tool, ToolConfig, toolIndex, ToolValue, ToolView, VarInfos } from "../tools-framework/tools";
import { refCode } from "./refsExtension";
import { memo, ReactNode, useCallback } from "react";
import { Value } from "../view/Value";
import WindowPortal from "./WindowPortal";

export const setup = [
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


export function toolCompletions(insertTool: (tool: Tool<any>) => string, replaceWithTool?: (tool: Tool<any>) => void): CompletionSource {
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
            if (replaceWithTool && from === 0 && to === view.state.doc.length) {
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

export function refCompletions(envGetter?: () => VarInfos | undefined, possibleEnvGetter?: () => PossibleVarInfos | undefined): CompletionSource {
  return (completionContext: CompletionContext) => {
    const env = envGetter ? envGetter() || {} : {};
    const possibleEnv = possibleEnvGetter ? possibleEnvGetter() || {} : {};

    let word = completionContext.matchBefore(/@?\w*/)!
    if (word.from === word.to && !completionContext.explicit) {
      return null
    }
    return {
      from: word.from,
      options: [
        ...Object.values(env).map((varInfo) => ({
          label: '@' + varInfo.config.label,
          apply: refCode(varInfo.config.id),
        })),
        ...Object.values(possibleEnv).map((possibleVarInfo) => ({
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

export interface SubToolProps {
  id: string,
  subToolConfigs: {[id: string]: ToolConfig},
  updateSubToolConfigs: Updater<{[id: string]: ToolConfig}>,
  updateOutputs: Updater<{[id: string]: ToolValue | null}>,
  updateViews: Updater<{[id: string]: ToolView | null}>,
}

export const SubTool = memo(({id, subToolConfigs, updateSubToolConfigs, updateOutputs, updateViews}: SubToolProps) => {
  const [config, updateConfig] = useAt(subToolConfigs, updateSubToolConfigs, id);

  const reportOutput = useCallback((output) => updateKeys(updateOutputs, {[id]: output}), [id, updateOutputs]);
  const reportView = useCallback((view) => updateKeys(updateViews, {[id]: view}), [id, updateViews]);

  const Tool = toolIndex[config.toolName]
  return <Tool
    config={config}
    updateConfig={updateConfig}
    reportOutput={reportOutput}
    reportView={reportView}
  />;
})


export interface ToolFrameProps {
  children: ReactNode;
  config: ToolConfig;
  onClose?: () => void;
  onCode?: () => void;
  onNotebook?: () => void;
  env: VarInfos;
  possibleEnv: PossibleVarInfos;
}

export const ToolFrame = memo(({children, config, onClose, onNotebook, onCode, env, possibleEnv}: ToolFrameProps) => {
  const [showInspector, updateShowInspector] = useStateUpdateOnly(false);

  return <div style={{ minWidth: 100, border: '1px solid #0083', position: "relative", display: 'inline-flex', flexDirection: 'column', maxWidth: '100%' }}>
    <div style={{height: 15, background: '#e4e4e4', fontSize: 13, color: '#0008', display: 'flex'}}>
      <div style={{marginLeft: 2}}>{config.toolName}</div>
      <div style={{flexGrow: 1}}></div>
      {onCode &&
        <div style={{background: '#0003', width: 15, height: 10, fontSize: 10, lineHeight: '10px', textAlign: 'center', alignSelf: 'center', cursor: 'pointer', marginRight: 3}}
          onClick={onCode}
        >co</div>
      }
      {onNotebook &&
        <div style={{background: '#0003', width: 15, height: 10, fontSize: 10, lineHeight: '10px', textAlign: 'center', alignSelf: 'center', cursor: 'pointer', marginRight: 3}}
          onClick={onNotebook}
        >nb</div>
      }
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
});
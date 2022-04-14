import { autocompletion, Completion, CompletionContext, completionKeymap, CompletionSource, pickedCompletion } from "@codemirror/autocomplete";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/closebrackets";
import { defaultKeymap } from "@codemirror/commands";
import { commentKeymap } from "@codemirror/comment";
import { foldKeymap } from "@codemirror/fold";
import { defaultHighlightStyle } from "@codemirror/highlight";
import { history, historyKeymap } from "@codemirror/history";
import { indentOnInput } from "@codemirror/language";
import { lintKeymap } from "@codemirror/lint";
import { bracketMatching } from "@codemirror/matchbrackets";
import { rectangularSelection } from "@codemirror/rectangular-selection";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import { drawSelection, dropCursor, EditorView, highlightSpecialChars, keymap } from "@codemirror/view";
import { memo, useCallback } from "react";
import { PossibleVarInfos, Tool, ToolConfig, toolIndex, ToolValue, ToolView, VarInfos } from "../tools-framework/tools";
import { updateKeys, Updater, useAt } from "../util/state";
import { refCode } from "./refsExtension";


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

export const SubTool = memo(function SubTool({id, subToolConfigs, updateSubToolConfigs, updateOutputs, updateViews}: SubToolProps) {
  const [config, updateConfig] = useAt(subToolConfigs, updateSubToolConfigs, id);

  const reportOutput = useCallback((output: ToolValue | null) => updateKeys(updateOutputs, {[id]: output}), [id, updateOutputs]);
  const reportView = useCallback((view: ToolView | null) => updateKeys(updateViews, {[id]: view}), [id, updateViews]);

  const Tool = toolIndex[config.toolName]
  return <Tool
    config={config}
    updateConfig={updateConfig}
    reportOutput={reportOutput}
    reportView={reportView}
  />;
})

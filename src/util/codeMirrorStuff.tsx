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
import { getFullToolIndex, lookUpTool, PossibleVarBindings, Tool, ToolProgram, ToolOutput, ToolView, VarBindings } from "src/tools-framework/tools";
import { updateKeys, Updater, useAt } from "src/util/state";
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
  ]),
]


export function toolCompletions(insertTool: (tool: Tool) => string, replaceWithTool?: (tool: Tool) => void): CompletionSource {
  return (completionContext: CompletionContext) => {
    let word = completionContext.matchBefore(/\/?\w*/)!
    if (word.from === word.to && !completionContext.explicit) {
      return null
    }
    return {
      from: word.from,
      options: [
        ...Object.entries(getFullToolIndex()).map(([toolName, tool]) => ({
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

export function refCompletions(varBindingsGetter?: () => VarBindings | undefined, possibleVarBindingsGetter?: () => PossibleVarBindings | undefined): CompletionSource {
  return (completionContext: CompletionContext) => {
    const varBindings = varBindingsGetter ? varBindingsGetter() || {} : {};
    const possibleVarBindings = possibleVarBindingsGetter ? possibleVarBindingsGetter() || {} : {};

    let word = completionContext.matchBefore(/@?\w*/)!
    if (word.from === word.to && !completionContext.explicit) {
      return null
    }
    return {
      from: word.from,
      options: [
        ...Object.values(varBindings).map((varInfo) => ({
          label: '@' + varInfo.var_.label,
          apply: refCode(varInfo.var_.id),
        })),
        ...Object.values(possibleVarBindings).map((possibleVarInfo) => ({
          label: '@' + possibleVarInfo.var_.label + '?',  // TODO: better signal that it's 'possible'
          apply: (view: EditorView, completion: Completion, from: number, to: number) => {
            let apply = refCode(possibleVarInfo.var_.id);
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
  subToolPrograms: {[id: string]: ToolProgram},
  updateSubToolPrograms: Updater<{[id: string]: ToolProgram}>,
  updateOutputs: Updater<{[id: string]: ToolOutput | null}>,
  updateViews: Updater<{[id: string]: ToolView | null}>,
}

// TODO: how is this not a standard function? hmmmmmmm
export const SubTool = memo(function SubTool({id, subToolPrograms, updateSubToolPrograms, updateOutputs, updateViews}: SubToolProps) {
  const [program, updateProgram] = useAt(subToolPrograms, updateSubToolPrograms, id);

  const reportOutput = useCallback((output: ToolOutput | null) => updateKeys(updateOutputs, {[id]: output}), [id, updateOutputs]);
  const reportView = useCallback((view: ToolView | null) => updateKeys(updateViews, {[id]: view}), [id, updateViews]);

  const Tool = lookUpTool(program.toolName);
  return <Tool.Component
    program={program}
    updateProgram={updateProgram}
    reportOutput={reportOutput}
    reportView={reportView}
  />;
})

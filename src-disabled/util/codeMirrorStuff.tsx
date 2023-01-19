import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { bracketMatching, defaultHighlightStyle, foldKeymap, indentOnInput, syntaxHighlighting } from "@codemirror/language"
import { lintKeymap } from "@codemirror/lint"
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search"
import { dropCursor, EditorView, highlightSpecialChars, keymap, rectangularSelection, tooltips } from "@codemirror/view"
import { memo, useCallback } from "react"
import { getFullToolIndex, lookUpTool, Tool, ToolOutput, ToolProgram, ToolView, VarBindings } from "src/engraft"
import { updateKeys, Updater } from "src/util/immutable"
import { refCode } from "../../src/util/refsExtension"
import { Completion, CompletionContext, CompletionSource, pickedCompletion } from "@codemirror/autocomplete"
import { useAt } from "../../src/util/immutable-react"


export const setup = [
  // lineNumbers(),
  // highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  // foldGutter(),
  // drawSelection(),    // note: disable this to allow CSS scaling
  dropCursor(),
  // EditorState.allowMultipleSelections.of(true),  // note: disable this to allow CSS scaling
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
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
    ...completionKeymap,
    ...lintKeymap
  ]),
  tooltips({ position: 'absolute', parent: document.body }),  // fixes layout of autocomplete tooltip in notebook-canvas
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
        ...Object.entries(getFullToolIndex())
          .filter(([_, tool]) => !tool.isInternal)
          .map(([toolName, tool]) => ({
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

export function refCompletions(varBindingsGetter?: () => VarBindings | undefined): CompletionSource {
  return (completionContext: CompletionContext) => {
    let word = completionContext.matchBefore(/@?\w*/)!
    if (word.from === word.to && !completionContext.explicit) {
      return null
    }

    const varBindings = varBindingsGetter ? varBindingsGetter() || {} : {};

    return {
      from: word.from,
      options: Object.values(varBindings).map((varBinding) => ({
        label: varBinding.var_.autoCompleteLabel || varBinding.var_.label,
        apply: refCode(varBinding.var_.id),
      })),
    }
  };
}

export interface SubToolProps {
  id: string,
  subToolPrograms: {[id: string]: ToolProgram},
  updateSubToolPrograms: Updater<{[id: string]: ToolProgram}>,
  varBindings: VarBindings,
  updateOutputs: Updater<{[id: string]: ToolOutput | null}>,
  updateViews: Updater<{[id: string]: ToolView | null}>,
}

// TODO: how is this not a standard function? hmmmmmmm
export const SubTool = memo(function SubTool({id, subToolPrograms, updateSubToolPrograms, varBindings, updateOutputs, updateViews}: SubToolProps) {
  const [program, updateProgram] = useAt(subToolPrograms, updateSubToolPrograms, id);

  const reportOutput = useCallback((output: ToolOutput | null) => updateKeys(updateOutputs, {[id]: output}), [id, updateOutputs]);
  const reportView = useCallback((view: ToolView | null) => updateKeys(updateViews, {[id]: view}), [id, updateViews]);

  const Tool = lookUpTool(program.toolName);
  return <Tool.Component
    program={program}
    updateProgram={updateProgram}
    varBindings={varBindings}
    reportOutput={reportOutput}
    reportView={reportView}
  />;
})

import { autocompletion, closeBrackets, closeBracketsKeymap, Completion, CompletionContext, completionKeymap, CompletionSource, pickedCompletion } from "@codemirror/autocomplete"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { bracketMatching, defaultHighlightStyle, foldKeymap, indentOnInput, syntaxHighlighting } from "@codemirror/language"
import { lintKeymap } from "@codemirror/lint"
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search"
import { dropCursor, EditorView, highlightSpecialChars, keymap, rectangularSelection, tooltips } from "@codemirror/view"
import { getFullToolIndex, Tool, VarBindings } from "src/engraft"
import { refCode } from "../../src/util/refsExtension"


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

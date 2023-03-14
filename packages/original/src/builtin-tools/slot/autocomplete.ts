import { Completion, CompletionContext, CompletionSource, pickedCompletion } from "@codemirror/autocomplete";
import { EditorView } from "@codemirror/view";
import { getFullToolIndex, Tool, VarBindings } from "@engraft/core";
import { refCode } from "./refs.js";


// TODO: varBindingsGetter is pretty weird; CodeMirror might have a more idiomatic approach
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

import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { bracketMatching, defaultHighlightStyle, foldKeymap, indentOnInput, syntaxHighlighting } from "@codemirror/language"
import { lintKeymap } from "@codemirror/lint"
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search"
import { Extension } from "@codemirror/state"
import { dropCursor, highlightSpecialChars, keymap, rectangularSelection, tooltips, EditorView } from "@codemirror/view"

let _setup: Extension[] | undefined = undefined;

export function setup(): Extension[] {
  if (!_setup) {
    _setup = [
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
      EditorView.theme({
        "&.cm-editor": {
          outline: "none",
          background: "rgb(245, 245, 245)",
        },
        "&.cm-editor.cm-focused": {
            outline: "none",
            background: "rgb(241, 246, 251)",
        },
      }),
    ];
  }
  return _setup;
}

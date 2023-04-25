import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { bracketMatching, defaultHighlightStyle, foldKeymap, indentOnInput, syntaxHighlighting } from "@codemirror/language"
import { lintKeymap } from "@codemirror/lint"
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search"
import { EditorState, Extension } from "@codemirror/state"
import { dropCursor, highlightSpecialChars, keymap, rectangularSelection, EditorView } from "@codemirror/view"

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
    ];
  }
  return _setup;
}

function copiedRange(state: EditorState) {
  let content = [], ranges: {from: number, to: number}[] = [], linewise = false
  for (let range of state.selection.ranges) if (!range.empty) {
    content.push(state.sliceDoc(range.from, range.to))
    ranges.push(range)
  }
  if (!content.length) {
    // Nothing selected, do a line-wise copy
    let upto = -1
    for (let {from} of state.selection.ranges) {
      let line = state.doc.lineAt(from)
      if (line.number > upto) {
        content.push(line.text)
        ranges.push({from: line.from, to: Math.min(state.doc.length, line.to + 1)})
      }
      upto = line.number
    }
    linewise = true
  }

  return {text: content.join(state.lineBreak), ranges, linewise}
}

// note: doesn't support brokenClipboardAPI or lastLinewiseCopy
export const defaultCopyCutHandler = (view: EditorView, event: ClipboardEvent) => {
  let {text, ranges, linewise} = copiedRange(view.state)
  if (!text && !linewise) return

  let data = event.clipboardData!
  event.preventDefault()
  // data.clearData()
  data.setData("text/plain", text)

  if (event.type === "cut" && !view.state.readOnly) {
    view.dispatch({
      changes: ranges,
      scrollIntoView: true,
      userEvent: "delete.cut"
    });
  }
}

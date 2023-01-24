import CodeMirror from './CodeMirror';

import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { bracketMatching, defaultHighlightStyle, foldKeymap, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { lintKeymap } from "@codemirror/lint";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { EditorState, RangeSet, Range } from "@codemirror/state";
import { Decoration, drawSelection, dropCursor, EditorView, highlightActiveLineGutter, highlightSpecialChars, keymap, lineNumbers, rectangularSelection, WidgetType } from "@codemirror/view";
import inspect from 'object-inspect';
import { Dispatch, useEffect, useMemo, useRef, useState } from 'react';
import { compileExpression } from './compile';
import { Callbacks, instrumentCode } from './instrumentation';



////////////////////////////
// CodeMirror decorations //
////////////////////////////

class HTMLWidget extends WidgetType {
  constructor(readonly html: string) { super() }

  eq(other: HTMLWidget) { return other.html === this.html }

  toDOM() {
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.html.trim();

    return tempDiv.firstElementChild as HTMLElement;
  }
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
 }

function valueWidget(text: string, offset: number) {
  return Decoration.widget({
    widget: new HTMLWidget(`<span class="chalk-value">${escapeHtml(text)}</span>`),
    side: 1
  }).range(offset)
}

function logDecoration(text: string, offset: number) {
  return Decoration.widget({
    widget: new HTMLWidget(`<span class="chalk-log">${text}</span>`),
    side: 1,
  }).range(offset);
}

function errorDecoration(text: string, offset: number) {
  return Decoration.widget({
    widget: new HTMLWidget(`<span class="chalk-error">${text}</span>`),
    side: 1,
  }).range(offset);
}

function underlineDecoration(start: number, end: number) {
  return Decoration.mark({
    class: "chalk-underline"
  }).range(start, end)
}

function fadeDecoration(start: number, end: number) {
  return Decoration.mark({
    class: "chalk-fade"
  }).range(start, end)
}

const allTheme = EditorView.baseTheme({
  ".chalk-error": {
    backgroundColor: 'rgba(255,0,0,0.3)',
    color: 'rgba(0,0,0,0.8)',
    fontFamily: 'sans-serif',
    fontSize: '80%',
    borderRadius: '5px',
    marginLeft: '15px',
    paddingLeft: '5px',
    paddingRight: '5px',
    border: '1px solid rgba(255,0,0,1)',
  },
  ".chalk-log": {
    backgroundColor: 'rgba(0,0,0,0.1)',
    color: 'rgba(0,0,0,0.8)',
    fontFamily: 'sans-serif',
    fontSize: '80%',
    borderRadius: '5px',
    marginLeft: '15px',
    paddingLeft: '5px',
    paddingRight: '5px',
  },
  ".chalk-value": {
    background:  'rgba(128, 0, 128, 0.7)',
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'sans-serif',
    fontSize: '80%',
    borderRadius: '5px',
    marginLeft: '15px',
    paddingLeft: '5px',
    paddingRight: '5px',
  },
  ".chalk-value + .chalk-value": {
    marginLeft: '5px',
  },
  ".chalk-fade": {
    opacity: 0.35,
  },
  ".chalk-fade .chalk-value": {
    // TODO: Value tokens in a false-cond `if` will be dimmed by .chalk-fade. It's not ideal, but fine for now.
    // This doesn't fix it:
    opacity: 2,
  },
  ".chalk-underline": {
    borderBottom: '1px solid rgba(128, 0, 128, 0.7)',
  },
});


////////////////////////////
// Basic CodeMirror setup //
////////////////////////////

export const basicExtensions = [
  lineNumbers(),
  // lineNumbersRight({formatNumber: (lineNo) => lineNo.toString().repeat(lineNo)}),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  // foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
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
    ...lintKeymap,
    indentWithTab,
  ]),

  javascript(),

]


/////////////////
// Chalk stuff //
/////////////////

interface Logs {
  decorations: Range<Decoration>[],
  lineNumber: number,
}

function newLogs(): Logs {
  return {
    decorations: [], lineNumber: 1
  };
}

function valueToString(value: unknown): string {
  return inspect(value);
}

export type ChalkResult = {value: any} | {error: any};

export type ChalkEditorProps = {
  code: string,
  input: any,
  setCode: Dispatch<string>,
  reportResult?: (result: ChalkResult) => void,
  showValues?: boolean,
  showErrors?: boolean,
}

function ChalkEditor({code, input, setCode, reportResult, showValues = true, showErrors = true}: ChalkEditorProps) {
  const cmText = useMemo(() => {
    return EditorState.create({doc: code}).doc;
  }, [code])

  const logsRef = useRef<Logs>(newLogs());
  const [logs, setLogs] = useState<Logs>(newLogs());

  const env: Callbacks = useMemo(() => {
    return {
      __inst_IfStatement_test: ({start, end, consequentStart, consequentEnd, alternateStart, alternateEnd}, value) => {
        const line = cmText.lineAt(start).number;
        if (showValues) {
          logsRef.current.decorations.push(underlineDecoration(start, end));
          logsRef.current.decorations.push(valueWidget(valueToString(value), cmText.line(line).to));
        }
        if (!value) {
          logsRef.current.decorations.push(fadeDecoration(consequentStart, consequentEnd));
        } else {
          if (alternateStart && alternateEnd) {
            logsRef.current.decorations.push(fadeDecoration(alternateStart, alternateEnd));
          }
        }
        return value;
      },
      __inst_VariableDeclarator_init: ({start, end}, value) => {
        const line = cmText.lineAt(start).number;
        if (showValues) {
          logsRef.current.decorations.push(underlineDecoration(start, end));
          logsRef.current.decorations.push(valueWidget(valueToString(value), cmText.line(line).to));
        }
        return value;
      },
      __inst_AssignmentExpression_right: ({start, end}, value) => {
        const line = cmText.lineAt(start).number;
        if (showValues) {
          logsRef.current.decorations.push(underlineDecoration(start, end));
          logsRef.current.decorations.push(valueWidget(valueToString(value), cmText.line(line).to));
        }
        return value;
      },
      __inst_ReturnStatement_argument: ({start, end}, value) => {
        const line = cmText.lineAt(start).number;
        if (showValues) {
          logsRef.current.decorations.push(underlineDecoration(start, end));
          logsRef.current.decorations.push(valueWidget(valueToString(value), cmText.line(line).to));
        }
        return value;
      },
      __inst_lineNum: (num) => {
        logsRef.current.lineNumber = num;
      },
      console: {
        log: (...vals: any[]) => {
          const text = vals.map((v) => inspect(v)).join(", ");
          const lineNum = logsRef.current.lineNumber;
          logsRef.current.decorations.push(logDecoration(text, cmText.line(lineNum!).to));
          console.log(...vals);
        }
      }
    }
  }, [cmText, showValues]);

  useEffect(() => {
    function done(result: ChalkResult) {
      // console.log("done", logsRef.current, result);
      reportResult && reportResult(result);
      setLogs(logsRef.current);
    }

    logsRef.current = newLogs();

    let generated: string;
    try {
      generated = instrumentCode(code)
    } catch (e) {
      if (showErrors) {
        logsRef.current.decorations.push(errorDecoration(`parse: ${(e as any).message}`, cmText.lineAt((e as any).raisedAt).to));
      }
      return done({error: e});
    }

    let compiled;
    try {
      compiled = compileExpression(generated);
    } catch (e) {
      return done({error: e})
    }

    let f = compiled(env);

    try {
      const value = (f as any)(input);
      return done({value})
    } catch (e) {
      if (!(e instanceof Error)) {
        return done({error: e})
      }

      const lineNum = logsRef.current.lineNumber;
      if (lineNum === null) {
        return done({error: e})
      }

      if (showErrors) {
        logsRef.current.decorations.push(errorDecoration(`runtime: ${e.message}`, cmText.line(lineNum).to));
      }

      return done({error: e})
    }
  }, [cmText, code, env, input, reportResult, showErrors])

  return <CodeMirror
    text={code} onChange={setCode}
    extensions={[
      basicExtensions, allTheme, EditorView.decorations.of(RangeSet.of(logs.decorations, true)),
    ]}
  />;
}

export default ChalkEditor;


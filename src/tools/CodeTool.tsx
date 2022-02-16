import { useCallback, useEffect, useMemo } from "react";
import { setKeys, setKeys2 } from "../util/setKeys";
import { registerTool, Tool, ToolConfig, toolIndex, ToolProps, ToolView } from "../tools-framework/tools";
import CodeMirror from "@uiw/react-codemirror"
import { javascript, javascriptLanguage } from "@codemirror/lang-javascript";
import { CompletionSource, CompletionContext } from "@codemirror/autocomplete";
import FunctionComponent from "../util/CallFunction";
import useStrictState, { subSetter } from "../util/useStrictState";

import {keymap, highlightSpecialChars, drawSelection, highlightActiveLine, dropCursor, DecorationSet, Decoration, EditorView, WidgetType} from "@codemirror/view"
import {Extension, EditorState, StateField, EditorSelection, TransactionSpec, Text} from "@codemirror/state"
import {history, historyKeymap} from "@codemirror/history"
import {foldGutter, foldKeymap} from "@codemirror/fold"
import {indentOnInput} from "@codemirror/language"
import {lineNumbers, highlightActiveLineGutter} from "@codemirror/gutter"
import {defaultKeymap} from "@codemirror/commands"
import {bracketMatching} from "@codemirror/matchbrackets"
import {closeBrackets, closeBracketsKeymap} from "@codemirror/closebrackets"
import {searchKeymap, highlightSelectionMatches} from "@codemirror/search"
import {autocompletion, completionKeymap} from "@codemirror/autocomplete"
import {commentKeymap} from "@codemirror/comment"
import {rectangularSelection} from "@codemirror/rectangular-selection"
import {defaultHighlightStyle} from "@codemirror/highlight"
import {lintKeymap} from "@codemirror/lint"
import { RangeSet } from "@codemirror/rangeset";
import CallFunction from "../util/CallFunction";

export type CodeConfig = {
  toolName: 'code';
} & (
  {
    type: 'text',
    text: string
  } |
  { type: 'tool',
    pickedConfig: ToolConfig
  }
)


function tryEval(code: string): unknown {
  try {
    return eval('(' + code + ')');
  } catch {
    return undefined;
  }
}

function tryEvalHack(code: string, context: any): unknown {
  try {
    return eval(`
      (() => {
        ${Object.entries(context).map(([key, value]) => `const ${key} = ${JSON.stringify((value as any).toolValue)};`).join("\n")}
        return (${code});
      })();
    `);
  } catch {
    return undefined;
  }
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



class RefWidget extends WidgetType {
  constructor(readonly id: string) { super() }

  toDOM() {
    let wrap = document.createElement("span")
    wrap.innerText = this.id
    wrap.className = "lc-ref"
    return wrap
  }

  destroy() {

  }
}

const refRE = new RegExp("__ref_(....)", "g")

function refsFromText(text: Text) {
  const matches = Array.from(text.sliceString(0).matchAll(refRE));

  return RangeSet.of(
    matches.map((match) => {
      return Decoration.replace({
        widget: new RefWidget(match[1])
      }).range(match.index!, match.index! + match[0].length)
    })
  );
}

const refsField = StateField.define<DecorationSet>({
  create(state) {
    return refsFromText(state.doc)
  },
  update(old, tr) {
    return refsFromText(tr.newDoc)
  },
  provide: f => EditorView.decorations.from(f)
})

const jumpOverRefs = EditorState.transactionFilter.of(tr => {
  // const userEvent = tr.annotation(Transaction.userEvent);
  const refs = tr.startState.field(refsField)

  // TODO: only single selection will be supported

  if (tr.isUserEvent('select')) {
    let {head, anchor} = tr.newSelection.main;
    let change = false;
    refs.between(head, head, (refFrom, refTo, ref) => {
      function applyWormhole(src: number, dst: number) {
        if (head === src) { head = dst; change = true; }
        if (anchor === src) { anchor = dst; change = true; }
      }
      applyWormhole(refTo - 1, refFrom);
      applyWormhole(refFrom + 1, refTo);
      if (change) { return false; }
    })
    if (change) {
      return [tr, {selection: tr.newSelection.replaceRange(EditorSelection.range(anchor, head))}];
    }
  } else if (tr.isUserEvent('delete.forward') || tr.isUserEvent('delete.backward')) {
    const forward = tr.isUserEvent('delete.forward')

    const head = tr.startState.selection.main.head;
    let result: TransactionSpec | readonly TransactionSpec[] = tr;
    refs.between(head, head, (refFrom, refTo, ref) => {
      if (head === (forward ? refFrom : refTo)) {
        result = [{changes: {from: refFrom, to: refTo}}];
        return false;
      }
    });
    return result;
  }

  return tr;
})

const refsTheme = EditorView.baseTheme({
  ".lc-ref": { background: 'lightblue', borderRadius: '10px', padding: '0px 5px' }
})



export function CodeTool({ context, config, reportConfig, reportOutput, reportView }: ToolProps<CodeConfig>) {
  // useEffect(() => {
  //   reportOutput.set({toolValue: config.text});
  // }, [config.text, reportOutput]);

  const [pickedView, setPickedView] = useStrictState<ToolView | null>(null);

  useEffect(() => {
    if (config.type === 'text') {
      reportOutput.set({toolValue: tryEvalHack(config.text, context)})
    }
  }, [config, reportOutput, context])

  const completions: CompletionSource = useCallback((context: CompletionContext) => {
    let word = context.matchBefore(/^.*/)!
    if (word.from === word.to && !context.explicit) {
      return null
    }
    return {
      from: word.from,
      options: Object.entries(toolIndex).map(([toolName, tool]) => ({
        label: '/' + toolName,
        apply: () => {
          reportConfig.update(setKeys2<CodeConfig>({type: 'tool', pickedConfig: tool.defaultConfig}))
        }
      }))
    }
  }, [])  // TODO: react to new completions or w/e

  useEffect(() => {
    reportView.set(() => {
      if (config.type === 'text') {
        return (
          <div style={{display: 'inline-block', minWidth: 20, border: '1px solid #0083'}}>
            <CodeMirror
              // extensions={[language]}
              // extensions={[language, language.language.data.of({ autocomplete: myCompletions }), checkboxPlugin]}
              basicSetup={false}
              extensions={[...setup, refsField, refsTheme, jumpOverRefs, javascript(), javascriptLanguage.data.of({ autocomplete: completions })]}
              indentWithTab={false}
              autoFocus={true}
              value={config.text}
              onChange={(value) => {
                reportConfig.update(setKeys2<CodeConfig>({text: value}))
              }}
            />
          </div>
        );
      } else {
        return <div style={{ display: 'inline-block', minWidth: 100, border: '1px solid #0083', padding: '10px', position: "relative", paddingTop: '15px', marginTop: '15px' }}>
          {pickedView ? <CallFunction f={() => pickedView({})} /> : <div>No view yet?</div>}
          <button
            style={{ alignSelf: "flex-end", position: "absolute", left: 8, top: -10, border: '1px solid rgba(0,0,0,0.2)' }}
            onClick={() => {
              reportConfig.update(setKeys2<CodeConfig>({type: 'text', text: ''}))
            }}>
            ×
          </button>
        </div>
      }
    })
  }, [config, pickedView, reportConfig, reportView])


  const forwardConfig = useMemo(() => subSetter<CodeConfig, any>(reportConfig, 'pickedConfig'), [reportConfig]);  // TODO: types

  if (config.type === 'tool') {
    const PickedTool = toolIndex[config.pickedConfig.toolName] as Tool<any> | undefined;

    if (PickedTool) {
      return <PickedTool
        context={context}
        config={config.pickedConfig}
        reportConfig={forwardConfig}
        reportOutput={reportOutput}
        reportView={setPickedView}
      />;
    }
  }

  return null;
}
registerTool(CodeTool, {
  toolName: 'code',
  type: 'text',
  text: ''
});

import { useCallback, useEffect, useMemo } from "react";
import { setKeys, setKeys2 } from "../util/setKeys";
import { registerTool, Tool, ToolConfig, toolIndex, ToolProps, ToolView } from "../tools-framework/tools";
import CodeMirror from "@uiw/react-codemirror"
import { javascript, javascriptLanguage } from "@codemirror/lang-javascript";
import { CompletionSource, CompletionContext } from "@codemirror/autocomplete";
import FunctionComponent from "../util/FunctionComponent";
import useStrictState, { subSetter } from "../util/useStrictState";

import {keymap, highlightSpecialChars, drawSelection, highlightActiveLine, dropCursor} from "@codemirror/view"
import {Extension, EditorState} from "@codemirror/state"
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
              extensions={[...setup, javascript(), javascriptLanguage.data.of({ autocomplete: completions })]}
              value={config.text}
              onChange={(value) => {
                reportConfig.update(setKeys2<CodeConfig>({text: value}))
              }}
            />
          </div>
        );
      } else {
        return <div style={{ display: 'inline-block', minWidth: 100, border: '1px solid #0083', padding: '10px', position: "relative", paddingTop: '15px', marginTop: '15px' }}>
          {pickedView ? <FunctionComponent f={pickedView} /> : <div>No view yet?</div>}
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

import { completionKeymap } from "@codemirror/autocomplete";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/closebrackets";
import { defaultKeymap } from "@codemirror/commands";
import { commentKeymap } from "@codemirror/comment";
import { foldKeymap } from "@codemirror/fold";
import { defaultHighlightStyle } from "@codemirror/highlight";
import { history, historyKeymap } from "@codemirror/history";
import { javascript } from "@codemirror/lang-javascript";
import { indentOnInput } from "@codemirror/language";
import { lintKeymap } from "@codemirror/lint";
import { bracketMatching } from "@codemirror/matchbrackets";
import { EditorState } from "@codemirror/state";
import { drawSelection, dropCursor, highlightSpecialChars, keymap } from "@codemirror/view";
import update from "immutability-helper";
import _ from "lodash";
import { CSSProperties, Fragment, memo, useCallback, useMemo, useState } from "react";
import { registerTool, ToolConfig, ToolProps, ToolViewRender } from "../tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "../tools-framework/useSubTool";
import CodeMirror from "../util/CodeMirror";
import { compileExpression } from "../util/compile";
import { newId } from "../util/id";
import { Updater, useAt } from "../util/state";
import { SynthesisState, synthesizeGen } from "../util/synthesizer";
import { Task } from "../util/Task";
import { flexRow } from "../view/styles";
import { codeConfigSetTo } from "./CodeTool";



interface InOutPair {
  id: string,
  inCode: string,
  outCode: string,
}

export interface SynthesizerConfig extends ToolConfig {
  toolName: 'synthesizer';
  inputConfig: ToolConfig;
  code: string;
  inOutPairs: InOutPair[];
}

export const codeMirrorExtensions = [
  highlightSpecialChars(),
  history(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  defaultHighlightStyle.fallback,
  bracketMatching(),
  closeBrackets(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...commentKeymap,
    ...completionKeymap,
    ...lintKeymap
  ]),
  javascript({jsx: true})
]

interface InOutPairViewProps {
  pair: InOutPair;
  pairIdx: number;
  updateInOutPairs: Updater<InOutPair[]>;
  isExtra: boolean;
  func: ((value: any) => unknown) | undefined;
}

export const InOutPairView = memo(function InOutPairView({pair, pairIdx, updateInOutPairs, isExtra, func}: InOutPairViewProps) {
  const fadeStyle: CSSProperties = isExtra ? { opacity: 0.5 } : {};

  const onChangeIn = useCallback((code: string) => {
    updateInOutPairs((old) => update(old, {[pairIdx]: {inCode: {$set: code}}}))
  }, [pairIdx, updateInOutPairs]);
  const onChangeOut = useCallback((code: string) => {
    updateInOutPairs((old) => update(old, {[pairIdx]: {outCode: {$set: code}}}))
  }, [pairIdx, updateInOutPairs]);
  const onFocus = useCallback(() => {
    if (isExtra) {
      updateInOutPairs((old) => update(old, {$push: [pair]}))
    }
  }, [isExtra, pair, updateInOutPairs])

  const isCorrect = useMemo(() => {
    if (func) {
      try {
        // eslint-disable-next-line no-eval
        const inVal = eval(pair.inCode), outVal = eval(pair.outCode);
        return _.isEqual(outVal, func(inVal));
      } catch {
      }
    }
    return false;
  }, [func, pair.inCode, pair.outCode])

  const incorrectStyle: CSSProperties = !isExtra && !isCorrect ? {
    borderRadius: 3,
    padding: 3,
    margin: -3,
    background: 'rgba(255,0,0,0.1)',
  } : {};

  return <Fragment>
    <CodeMirror
      extensions={codeMirrorExtensions}
      style={{...fadeStyle, minWidth: 0}}
      text={pair.inCode}
      onChange={onChangeIn}
      onFocus={onFocus}
    />
    <div
      style={{...fadeStyle, marginLeft: 5, marginRight: 5}}
    >
      →
    </div>
    <CodeMirror
      extensions={codeMirrorExtensions}
      style={{...fadeStyle, minWidth: 0, ...incorrectStyle}}
      text={pair.outCode}
      onChange={onChangeOut}
      onFocus={onFocus}
    />
    { !isExtra ?
      <div
        style={{fontSize: '50%', marginLeft: 7, cursor: 'pointer'}}
        onClick={(ev) => {
          updateInOutPairs((old) => update(old, {$splice: [[pairIdx, 1]]}))
        }}
      >
        ❌
      </div> :
      <div/>
    }
  </Fragment>
})

export const SynthesizerTool = memo(function SynthesizerTool({ config, updateConfig, reportOutput, reportView }: ToolProps<SynthesizerConfig>) {
  const [inputComponent, inputView, inputOutput] = useSubTool({config, updateConfig, subKey: 'inputConfig'})

  const [inOutPairs, updateInOutPairs] = useAt(config, updateConfig, 'inOutPairs');
  const [code, updateCode] = useAt(config, updateConfig, 'code');

  const [synthesisTask, setSynthesisTask] = useState<Task<SynthesisState, String | undefined> | undefined>(undefined);
  const [progress, setProgress] = useState<SynthesisState["progress"] | undefined>(undefined);

  const func = useMemo(() => {
    try {
      const compiled = compileExpression(config.code);
      return (input: any) => compiled({input});
    } catch {

    }
  }, [config.code])

  const output = useMemo(() => {
    if (inputOutput && func) {
      try {
        return { toolValue: func(inputOutput.toolValue) };
      } catch {
      }
    }
    return null;
  }, [func, inputOutput]);
  useOutput(reportOutput, output);

  const extraInOutPair: InOutPair = useMemo(() => {
    try {
      if (inputOutput) {
        const inCode = JSON.stringify(inputOutput.toolValue);
        if (!inOutPairs.some((pair) => pair.inCode === inCode) && func) {
          let outCode;
          try {
            outCode = JSON.stringify(func(inputOutput.toolValue))
          } catch {
            outCode = 'undefined';
          }
          return {
            id: newId(),
            inCode,
            outCode,
          }
        }
      }
    } catch {
    }
    return {
      id: newId(),
      inCode: '',
      outCode: '',
    };
  }, [func, inOutPairs, inputOutput])

  const render: ToolViewRender = useCallback(function R({autoFocus}) {
    const inOutPairsIncExtra = [...inOutPairs, extraInOutPair];

    return (
      <div style={{padding: 10}}>
        <div className="SynthesizerTool-input-row" style={{marginBottom: 10, ...flexRow(), gap: 10}}>
          <span style={{fontWeight: 'bold'}}>input</span> <ShowView view={inputView} autoFocus={autoFocus} />
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, auto)', alignItems: 'center'}}>
          {inOutPairsIncExtra.map((pair, pairIdx) =>
            <InOutPairView
              key={pair.id}
              pair={pair}
              pairIdx={pairIdx}
              updateInOutPairs={updateInOutPairs}
              isExtra={!inOutPairs.includes(pair)}
              func={func}
            />
          )}
        </div>
        <div style={{...flexRow(), marginTop: 10}}>
          <button
            onClick={() => {
              // eslint-disable-next-line no-eval
              const pairs: [string, string][] = inOutPairs.map((pair) => [eval(pair.inCode), eval(pair.outCode)])
              if (synthesisTask) {
                synthesisTask.cancel();
              }
              const task = new Task(synthesizeGen(pairs), {
                onComplete(complete) {
                  if (complete) {
                    updateCode(() => complete);
                  } else {
                  }
                  setProgress(undefined);
                  setSynthesisTask(undefined);
                },
                onProgress(state) {
                  setProgress({...state.progress});
                },
              });
              setSynthesisTask(task);
              task.start();
            }}
          >
            Run
          </button>
          {synthesisTask &&
            <button
              onClick={() => {
                synthesisTask.cancel();
                setProgress(undefined);
                setSynthesisTask(undefined);
              }}
            >
              Cancel
            </button>
          }
        </div>
        <div className="SynthesizerTool-output-row" style={{marginTop: 10, ...flexRow(), gap: 10}}>
          <span style={{fontWeight: 'bold'}}>code</span> <div style={{fontFamily: 'monospace'}}>{code}</div>
        </div>
        <div>
          {progress && <pre>{JSON.stringify(progress, null, 2)}</pre>}
        </div>
      </div>
    );
  }, [code, extraInOutPair, func, inOutPairs, inputView, progress, synthesisTask, updateCode, updateInOutPairs]);
  useView(reportView, render, config);

  return <>
    {inputComponent}
  </>
});
registerTool<SynthesizerConfig>(SynthesizerTool, 'synthesizer', () => {
  return {
    toolName: 'synthesizer',
    inputConfig: codeConfigSetTo(''),
    code: 'input',
    inOutPairs: []
  };
});

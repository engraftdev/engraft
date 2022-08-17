import { closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { javascript } from "@codemirror/lang-javascript"
import { bracketMatching, defaultHighlightStyle, foldKeymap, indentOnInput, syntaxHighlighting } from "@codemirror/language"
import { lintKeymap } from "@codemirror/lint"
import { EditorState } from "@codemirror/state"
import { drawSelection, dropCursor, highlightSpecialChars, keymap } from "@codemirror/view"
import update from "immutability-helper"
import _ from "lodash"
import { CSSProperties, Fragment, memo, useCallback, useMemo, useState } from "react"
import { codeProgramSetTo } from "src/builtin-tools/code"
import { hasValue, ProgramFactory, ToolProgram, ToolProps } from "src/tools-framework/tools"
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool"
import CodeMirror from "src/util/CodeMirror"
import { compileExpression } from "src/util/compile"
import { newId } from "src/util/id"
import { Updater, useAt } from "src/util/state"
import { Task } from "src/util/Task"
import { SynthesisState, synthesizeGen } from "./synthesizer"



interface InOutPair {
  id: string,
  inCode: string,
  outCode: string,
}

export type Program = {
  toolName: 'synthesizer';
  inputProgram: ToolProgram;
  code: string;
  inOutPairs: InOutPair[];
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => {
  return {
    toolName: 'synthesizer',
    inputProgram: codeProgramSetTo(defaultCode || ''),
    code: 'input',
    inOutPairs: []
  };
};

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [inputComponent, inputView, inputOutput] = useSubTool({program, updateProgram, subKey: 'inputProgram'})

  const [inOutPairs, updateInOutPairs] = useAt(program, updateProgram, 'inOutPairs');
  const [code, updateCode] = useAt(program, updateProgram, 'code');

  const [synthesisTask, setSynthesisTask] = useState<Task<SynthesisState, String | undefined> | undefined>(undefined);
  const [progress, setProgress] = useState<SynthesisState["progress"] | undefined>(undefined);

  const func = useMemo(() => {
    try {
      const compiled = compileExpression(program.code);
      return (input: any) => compiled({input});
    } catch {

    }
  }, [program.code])

  useOutput(reportOutput, useMemo(() => {
    if (hasValue(inputOutput) && func) {
      try {
        return { value: func(inputOutput.value) };
      } catch {
      }
    }
    return null;
  }, [func, inputOutput]));

  const extraInOutPair: InOutPair = useMemo(() => {
    try {
      if (hasValue(inputOutput)) {
        const inCode = JSON.stringify(inputOutput.value);
        if (!inOutPairs.some((pair) => pair.inCode === inCode) && func) {
          let outCode;
          try {
            outCode = JSON.stringify(func(inputOutput.value))
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

  const inOutPairsIncExtra = useMemo(() => [...inOutPairs, extraInOutPair], [extraInOutPair, inOutPairs]);

  useView(reportView, useMemo(() => ({
    render: ({autoFocus}) =>
      <div style={{padding: 10}}>
        <div className="SynthesizerTool-input-row xRow" style={{marginBottom: 10, gap: 10}}>
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
        <div className="xRow" style={{marginTop: 10}}>
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
        <div className="SynthesizerTool-output-row xRow" style={{marginTop: 10, gap: 10}}>
          <span style={{fontWeight: 'bold'}}>code</span> <div style={{fontFamily: 'monospace'}}>{code}</div>
        </div>
        <div>
          {progress && <pre>{JSON.stringify(progress, null, 2)}</pre>}
        </div>
      </div>
  }), [code, func, inOutPairs, inOutPairsIncExtra, inputView, progress, synthesisTask, updateCode, updateInOutPairs]));

  return <>
    {inputComponent}
  </>
});



export const codeMirrorExtensions = [
  highlightSpecialChars(),
  history(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
  bracketMatching(),
  closeBrackets(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...historyKeymap,
    ...foldKeymap,
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

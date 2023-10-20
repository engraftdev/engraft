import { CodeMirror, setup } from "@engraft/codemirror-helpers"
import { CollectReferences, EngraftPromise, MakeProgram, PromiseState, ShowView, ToolOutput, ToolProgram, ToolProps, ToolResult, ToolRun, ToolView, ToolViewRenderProps, defineTool, hookRunTool, randomId, slotWithCode, usePromiseState } from "@engraft/core"
import { hookMemo, hooks, memoizeProps } from "@engraft/refunc"
import { compileExpressionCached } from "@engraft/shared/lib/compile.js"
import { UpdateProxyRemovable, updateProxy } from "@engraft/update-proxy"
import _ from "lodash"
import { CSSProperties, Fragment, memo, useCallback, useMemo, useState } from "react"
import { Task } from "./Task.js"
import { SynthesisState, synthesizeGen } from "./synthesizer.js"



interface InOutPair {
  id: string,
  inCode: string,
  outCode: string,
}

type Program = {
  toolName: 'synthesizer';
  inputProgram: ToolProgram;
  code: string;
  inOutPairs: InOutPair[];
}

const makeProgram: MakeProgram<Program> = (defaultCode?: string) => {
  return {
    toolName: 'synthesizer',
    inputProgram: slotWithCode(defaultCode || ''),
    code: 'input',
    inOutPairs: []
  };
};

const collectReferences: CollectReferences<Program> = (program) => program.inputProgram;

const run: ToolRun<Program> = memoizeProps(hooks((props) => {
  const { program, varBindings } = props;

  const inputResult = hookRunTool({program: program.inputProgram, varBindings});

  const funcP = hookMemo(() => EngraftPromise.try(() => {
    const compiled = compileExpressionCached(program.code);
    return (input: any) => compiled({input});
  }), [program.code]);

  const outputP: EngraftPromise<ToolOutput> = hookMemo(() =>
    EngraftPromise.all(inputResult.outputP, funcP).then(([inputOutput, func]) => {
      return { value: func(inputOutput.value) };
    }),
  [inputResult.outputP, funcP]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: (renderProps) => <View {...props} {...renderProps} inputResult={inputResult} funcP={funcP}/>
  }), [funcP, inputResult, props]);

  return {outputP, view};
}));

export default defineTool({ name: 'synthesizer', makeProgram, collectReferences, run })


const View = memo((props: ToolProps<Program> & ToolViewRenderProps<Program> & {
  inputResult: ToolResult<ToolProgram>,
  funcP: EngraftPromise<(input: any) => any>,
}) => {
  const { program, updateProgram, autoFocus, inputResult, funcP } = props;
  const programUP = updateProxy(updateProgram)

  const [synthesisTask, setSynthesisTask] = useState<Task<SynthesisState, String | undefined> | undefined>(undefined);
  const [progress, setProgress] = useState<SynthesisState["progress"] | undefined>(undefined);

  const inputOutputState = usePromiseState(inputResult.outputP);
  const funcState = usePromiseState(funcP);

  const extraInOutPair: InOutPair = useMemo(() => {
    try {
      if (inputOutputState.status === 'fulfilled' && funcState.status === 'fulfilled') {
        const inputOutputValue = inputOutputState.value.value;
        const func = funcState.value;
        const inCode = JSON.stringify(inputOutputValue);
        if (!program.inOutPairs.some((pair) => pair.inCode === inCode)) {
          let outCode;
          try {
            outCode = JSON.stringify(func(inputOutputValue))
          } catch {
            outCode = 'undefined';
          }
          return {
            id: randomId(),
            inCode,
            outCode,
          }
        }
      }
    } catch {
    }
    return {
      id: randomId(),
      inCode: '',
      outCode: '',
    };
  }, [inputOutputState, funcState, program.inOutPairs])

  const inOutPairsIncExtra = useMemo(() => [...program.inOutPairs, extraInOutPair], [program.inOutPairs, extraInOutPair]);

  return <div style={{padding: 10}}>
    <div className="SynthesizerTool-input-row xRow" style={{marginBottom: 10, gap: 10}}>
      <span style={{fontWeight: 'bold'}}>input</span> <ShowView view={inputResult.view} updateProgram={programUP.inputProgram.$} autoFocus={autoFocus} />
    </div>

    <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, auto)', alignItems: 'center'}}>
      {inOutPairsIncExtra.map((pair, i) =>
        <InOutPairView
          key={pair.id}
          pair={pair}
          pairUP={programUP.inOutPairs[i]}
          isExtra={!program.inOutPairs.includes(pair)}
          funcState={funcState}
        />
      )}
    </div>
    <div className="xRow" style={{marginTop: 10}}>
      <button
        onClick={() => {
          // eslint-disable-next-line no-eval
          const pairs: [string, string][] = program.inOutPairs.map((pair) => [eval(pair.inCode), eval(pair.outCode)])
          if (synthesisTask) {
            synthesisTask.cancel();
          }
          const task = new Task(synthesizeGen(pairs), {
            onComplete(complete) {
              if (complete) {
                programUP.code.$set(complete);
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
      <span style={{fontWeight: 'bold'}}>code</span> <div style={{fontFamily: 'monospace'}}>{program.code}</div>
    </div>
    <div>
      {progress && <pre>{JSON.stringify(progress, null, 2)}</pre>}
    </div>
  </div>
});


export const InOutPairView = memo(function InOutPairView(props: {
  pair: InOutPair,
  pairUP: UpdateProxyRemovable<InOutPair>,
  isExtra: boolean,
  funcState: PromiseState<((value: any) => unknown)>,
}) {
  const { pair, pairUP, isExtra, funcState } = props;
  const fadeStyle: CSSProperties = isExtra ? { opacity: 0.5 } : {};

  const onFocus = useCallback(() => {
    if (isExtra) {
      pairUP.$set(pair);  // add it for real
    }
  }, [isExtra, pairUP, pair])

  const isCorrect = useMemo(() => {
    if (funcState.status === 'fulfilled') {
      try {
        // eslint-disable-next-line no-eval
        const inVal = eval(pair.inCode), outVal = eval(pair.outCode);
        return _.isEqual(outVal, funcState.value(inVal));
      } catch {
      }
    }
    return false;
  }, [funcState, pair.inCode, pair.outCode])

  const incorrectStyle: CSSProperties = !isExtra && !isCorrect ? {
    borderRadius: 3,
    padding: 3,
    margin: -3,
    background: 'rgba(255,0,0,0.1)',
  } : {};

  return <Fragment>
    <CodeMirror
      extensions={setup()}
      style={{...fadeStyle, minWidth: 0}}
      text={pair.inCode}
      onChange={pairUP.inCode.$set}
      onFocus={onFocus}
    />
    <div
      style={{...fadeStyle, marginLeft: 5, marginRight: 5}}
    >
      →
    </div>
    <CodeMirror
      extensions={setup()}
      style={{...fadeStyle, minWidth: 0, ...incorrectStyle}}
      text={pair.outCode}
      onChange={pairUP.outCode.$set}
      onFocus={onFocus}
    />
    { !isExtra ?
      <div
        style={{fontSize: '50%', marginLeft: 7, cursor: 'pointer'}}
        onClick={pairUP.$remove}
      >
        ✕
      </div> :
      <div/>
    }
  </Fragment>
})

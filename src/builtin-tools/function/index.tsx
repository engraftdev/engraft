import _ from "lodash";
import { memo, useCallback, useEffect, useMemo } from "react";
import { ComputeReferences, newVar, ProgramFactory, references, ToolProgram, ToolProps, ToolRun, ToolView, ToolViewRenderProps, Var } from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { usePromiseState } from "src/engraft/EngraftPromise.react";
import { hookRelevantVarBindings } from "src/engraft/hooks";
import { ToolWithView } from "src/engraft/ToolWithView";
import { hookDedupe, hookMemo } from "src/incr/hookMemo";
import { hooks } from "src/incr/hooks";
import { memoizeProps } from "src/incr/memoize";
import { objEqWithRefEq } from "src/util/eq";
import { newId } from "src/util/id";
import { atAllIndices, atIndexZip, removers, Updater } from "src/util/immutable";
import { useAt } from "src/util/immutable-react";
import { noOp } from "src/util/noOp";
import { difference } from "src/util/sets";
import { updateF } from "src/util/updateF";
import { useContextMenu } from "src/util/useContextMenu";
import { MyContextMenu, MyContextMenuHeading } from "src/view/MyContextMenu";
import { SettableValue } from "src/view/SettableValue";
import { ToolOutputView } from "src/view/Value";
import { VarDefinition } from "src/view/Vars";
import { slotSetTo } from "../slot";
import { Closure, closureToSyncFunction, valuesToVarBindings } from "./closure";

export type Program = {
  toolName: 'function',
  vars: Var[],
  bodyProgram: ToolProgram,
  examples: Example[],
  activeExampleId: string,
}

type Example = {
  id: string,
  values: unknown[],  // parallel with vars
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => {
  const var1 = newVar('input 1')
  const exampleId = newId();
  return {
    toolName: 'function',
    vars: [var1],
    bodyProgram: slotSetTo(var1.id),
    examples: [{id: exampleId, values: [undefined]}],
    activeExampleId: exampleId,
  }
};

export const computeReferences: ComputeReferences<Program> = (program) =>
  difference(references(program.bodyProgram), program.vars.map((v) => v.id));

export const run: ToolRun<Program> = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program } = props;
  const { vars, bodyProgram } = program;
  const relevantVarBindings = hookRelevantVarBindings(props);

  const closure: Closure = hookDedupe({
    vars,
    bodyProgram,
    closureVarBindings: relevantVarBindings,
  }, objEqWithRefEq);

  const syncFunction = hookMemo(() => {
    return closureToSyncFunction(closure);
  }, [closure]);

  const outputP = hookMemo(() => {
    return EngraftPromise.resolve({value: syncFunction});
  }, [syncFunction]);

  const view: ToolView = hookMemo(() => ({
    render: (renderProps) =>
      <View {...props} {...renderProps} syncFunction={syncFunction}/>
  }), [props]);

  return {outputP, view};
}));


type ViewProps = ToolProps<Program> & ToolViewRenderProps & {
  syncFunction: (...args: unknown[]) => unknown,
}

const View = memo((props: ViewProps) => {
  const { program, updateProgram, varBindings, syncFunction } = props;

  const [ bodyProgram, updateBodyProgram ] = useAt(program, updateProgram, 'bodyProgram');

  const [ vars, updateVars ] = useAt(program, updateProgram, 'vars');
  const varsZipped = useMemo(() => atIndexZip(vars, updateVars), [vars, updateVars]);

  const [ examples, updateExamples ] = useAt(program, updateProgram, 'examples');
  const examplesZipped = useMemo(() => atIndexZip(examples, updateExamples), [examples, updateExamples]);

  const [ activeExampleId, updateActiveExampleId ] = useAt(program, updateProgram, 'activeExampleId');

  const varRemovers = useMemo(() => Array.from({length: vars.length}, (_, i) =>
    () => {
      updateVars(updateF({$splice: [[i, 1]]}));
      // omg this updater situation is anarchy
      atAllIndices(updateExamples)(updateF({values: {$splice: [[i, 1]]}}));
    }
  ), [updateExamples, updateVars, vars.length]);

  const varInserters = useMemo(() => Array.from({length: vars.length}, (_, i) =>
    () => {
      updateVars(updateF({$splice: [[i + 1, 0, newVar(`input ${i + 2}`)]]}));
      // omg this updater situation is anarchy
      atAllIndices(updateExamples)(updateF({values: {$splice: [[i + 1, 0, '']]}}));
    }
  ), [updateExamples, updateVars, vars.length]);

  const exampleRemovers = useMemo(() => removers(updateExamples, examples.length), [examples.length, updateExamples]);
  useEffect(() => {
    if (!_.find(examples, {id: activeExampleId})) {
      updateActiveExampleId(() => examples[0].id);
    }
  }, [activeExampleId, examples, updateActiveExampleId])

  const exampleInserters = useMemo(() => Array.from({length: examples.length}, (_, i) =>
    () => {
      const newExample: Example = {
        id: newId(),
        values: Array.from({length: vars.length}, () => undefined),
      };
      updateExamples(updateF({$splice: [[i + 1, 0, newExample]]}));
      updateActiveExampleId(() => newExample.id);
    }
  ), [examples.length, updateActiveExampleId, updateExamples, vars.length]);

  const bodyVarBindings = useMemo(() => {
    const activeExample = _.find(examples, {id: activeExampleId})!;

    return {
      ...varBindings,
      ...valuesToVarBindings(activeExample.values, vars),
    };
  }, [activeExampleId, examples, varBindings, vars]);

  return <div className="xCol xGap10 xPad10">
    <div className="xRow xGap10">
      <table>
        <thead>
          <tr>
            <td>{/* for option buttons */}</td>
            {varsZipped.map(([var_, updateVar], i) =>
              <VarHeading key={var_.id}
                var_={var_} updateVar={updateVar}
                removeVar={vars.length > 1 ? varRemovers[i] : undefined}
                insertVar={varInserters[i]}
              />
            )}
            <td style={{fontSize: '80%'}}>
              output
            </td>
          </tr>
        </thead>
        <tbody>
          {examplesZipped.map(([example, updateExample], i) =>
            <ExampleRow key={example.id}
              example={example} updateExample={updateExample}
              activeExampleId={activeExampleId} updateActiveExampleId={updateActiveExampleId}
              removeExample={examples.length > 1 ? exampleRemovers[i] : undefined}
              insertExample={exampleInserters[i]}
              syncFunction={syncFunction}
            />)}
        </tbody>
      </table>
    </div>

    <div className="xRow xGap10">
      <ToolWithView program={bodyProgram} updateProgram={updateBodyProgram} reportOutputState={noOp} varBindings={bodyVarBindings}/>
    </div>

  </div>;
});

type VarHeadingProps = {
  var_: Var,
  updateVar: Updater<Var>,

  removeVar?: () => void,
  insertVar: () => void,
};

const VarHeading = memo((props: VarHeadingProps) => {
  const {var_, updateVar, removeVar, insertVar} = props;

  const { openMenu, menuNode } = useContextMenu(useCallback((closeMenu) =>
    <MyContextMenu>
      <MyContextMenuHeading>Var</MyContextMenuHeading>
      <div>
        <button
          onClick={() => {
            insertVar();
            closeMenu();
          }}
        >
          Insert after
        </button>
      </div>
      {removeVar && <div>
        <button
          onClick={() => {
            removeVar();
            closeMenu();
          }}
        >
          Delete
        </button>
      </div>}
    </MyContextMenu>
  , [insertVar, removeVar]));

  return <td onContextMenu={openMenu}>
    {menuNode}
    <VarDefinition key={var_.id} var_={var_} updateVar={updateVar}/>
  </td>
});


type ExampleRowProps = {
  example: Example,
  updateExample: Updater<Example>,

  activeExampleId: string,
  updateActiveExampleId: Updater<string>,

  removeExample?: () => void,
  insertExample: () => void,

  syncFunction: (...args: unknown[]) => unknown,
};

const ExampleRow = memo((props: ExampleRowProps) => {
  const { example, updateExample, activeExampleId, updateActiveExampleId, removeExample, insertExample, syncFunction } = props;

  const output = useMemo(() => EngraftPromise.try(() => {
    return {value: syncFunction(...example.values)};
  }), [example.values, syncFunction]);
  const outputState = usePromiseState(output);

  const [ values, updateValues ] = useAt(example, updateExample, 'values');
  const valuesZipped = useMemo(() => atIndexZip(values, updateValues), [values, updateValues]);

  const makeThisRowActive = useCallback(() => {
    updateActiveExampleId(() => example.id);
  }, [example.id, updateActiveExampleId]);

  const { openMenu, menuNode } = useContextMenu(useCallback((closeMenu) =>
    <MyContextMenu>
      <MyContextMenuHeading>Example</MyContextMenuHeading>
      <div>
        <button
          onClick={() => {
            insertExample();
            closeMenu();
          }}
        >
          Insert below
        </button>
      </div>
      {removeExample && <div>
        <button
          onClick={() => {
            removeExample();
            closeMenu();
          }}
        >
          Delete
        </button>
      </div>}
    </MyContextMenu>
  , [insertExample, removeExample]));

  return <tr onContextMenu={openMenu} style={{...example.id === activeExampleId && {background: '#eee'}}}>
    {menuNode}
    <td>
      <input
        type="radio"
        checked={example.id === activeExampleId}
        onChange={makeThisRowActive}
      />
    </td>
    {valuesZipped.map(([value, updateValue], i) =>
      <td key={i}>
        <SettableValue value={value} setValue={(v) => updateValue(() => v)}/>
      </td>
    )}
    <td>
      <ToolOutputView outputState={outputState}/>
    </td>
  </tr>
});

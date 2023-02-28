import _ from "lodash";
import { memo, useCallback, useMemo } from "react";
import { ComputeReferences, newVar, ProgramFactory, references, ToolProgram, ToolProps, ToolRun, ToolView, ToolViewRenderProps, Var } from "../../engraft";
import { EngraftPromise } from "../../engraft/EngraftPromise";
import { hookRelevantVarBindings } from "../../engraft/hooks";
import { ToolWithView } from "../../engraft/ToolWithView";
import { hookDedupe, hookMemo } from "../../incr/hookMemo";
import { hooks } from "../../incr/hooks";
import { memoizeProps } from "../../incr/memoize";
import { objEqWithRefEq } from "@engraft/shared/src/eq";
import { newId } from "../../util/id";
import { noOp } from "../../util/noOp";
import { difference } from "../../util/sets";
import { UpdateProxy } from "../../util/UpdateProxy";
import { useUpdateProxy } from "../../util/UpdateProxy.react";
import { useContextMenu } from "../../util/useContextMenu";
import { MyContextMenu, MyContextMenuHeading } from "../../view/MyContextMenu";
import { SettableValue } from "../../view/SettableValue";
import { ToolOutputView } from "../../view/Value";
import { VarDefinition } from "../../view/Vars";
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

  const view: ToolView<Program> = hookMemo(() => ({
    render: (renderProps) =>
      <View {...props} {...renderProps} syncFunction={syncFunction}/>
  }), [props]);

  return {outputP, view};
}));


type ViewProps = ToolProps<Program> & ToolViewRenderProps<Program> & {
  syncFunction: (...args: unknown[]) => unknown,
}

const View = memo((props: ViewProps) => {
  const { program, updateProgram, varBindings, syncFunction } = props;

  const programUP = useUpdateProxy(updateProgram);

  const bodyVarBindings = useMemo(() => {
    const activeExample = _.find(program.examples, {id: program.activeExampleId})!;

    return {
      ...varBindings,
      ...valuesToVarBindings(activeExample.values, program.vars),
    };
  }, [program.activeExampleId, program.examples, program.vars, varBindings]);

  return <div className="xCol xGap10 xPad10">
    <div className="xRow xGap10">
      <table>
        <thead>
          <tr>
            <td>{/* for option buttons */}</td>
            {program.vars.map((var_, i) =>
              <VarHeading key={var_.id}
                var_={var_} index={i}
                programUP={programUP}
              />
            )}
            <td style={{fontSize: '80%'}}>
              output
            </td>
          </tr>
        </thead>
        <tbody>
          {program.examples.map((example, i) =>
            <ExampleRow key={example.id}
              example={example} index={i}
              programUP={programUP}
              numVars={program.vars.length}
              activeExampleId={program.activeExampleId}
              syncFunction={syncFunction}
            />)}
        </tbody>
      </table>
    </div>

    <div className="xRow xGap10">
      <ToolWithView program={program.bodyProgram} updateProgram={programUP.bodyProgram.$apply} reportOutputState={noOp} varBindings={bodyVarBindings}/>
    </div>

  </div>;
});

type VarHeadingProps = {
  var_: Var,
  index: number,
  programUP: UpdateProxy<Program>,
};

const VarHeading = memo((props: VarHeadingProps) => {
  const {var_, index, programUP} = props;

  const varUP = programUP.vars[index];

  const insertVarAfter = useCallback(() => {
    programUP.vars.$helper({$splice: [[index + 1, 0, newVar(`input ${index + 2}`)]]});
    programUP.examples.$all.values.$helper({$splice: [[index + 1, 0, '']]});
  }, [index, programUP]);


  const { openMenu, menuNode } = useContextMenu(useCallback((closeMenu) =>
    <MyContextMenu>
      <MyContextMenuHeading>Var</MyContextMenuHeading>
      <div>
        <button
          onClick={() => {
            insertVarAfter();
            closeMenu();
          }}
        >
          Insert after
        </button>
      </div>
      {<div>
        <button
          onClick={() => {
            varUP.$remove();
            closeMenu();
          }}
        >
          Delete
        </button>
      </div>}
    </MyContextMenu>
  , [insertVarAfter, varUP]));

  return <td onContextMenu={openMenu}>
    {menuNode}
    <VarDefinition key={var_.id} var_={var_} updateVar={varUP.$apply}/>
  </td>
});


type ExampleRowProps = {
  example: Example,
  index: number,
  programUP: UpdateProxy<Program>,

  numVars: number,
  activeExampleId: string,
  syncFunction: (...args: unknown[]) => unknown,
};

const ExampleRow = memo((props: ExampleRowProps) => {
  const { example, index, programUP, numVars, activeExampleId, syncFunction } = props;

  const exampleUP = programUP.examples[index];

  const removeExample = useCallback(() => {
    exampleUP.$remove();
    programUP.$apply((oldProgram) => {
      if (oldProgram.activeExampleId === example.id) {
        return {...oldProgram, activeExampleId: oldProgram.examples[0].id};
      }
      return oldProgram;
    });
  }, [example.id, exampleUP, programUP]);

  const insertExampleAfter = useCallback(() => {
    const newExample: Example = {
      id: newId(),
      values: Array.from({length: numVars}, () => undefined),
    };
    programUP.examples.$helper({$splice: [[index + 1, 0, newExample]]});
    programUP.activeExampleId.$set(newExample.id);
  }, [index, numVars, programUP.activeExampleId, programUP.examples]);

  const outputP = useMemo(() => EngraftPromise.try(() => {
    return {value: syncFunction(...example.values)};
  }), [example.values, syncFunction]);

  const makeThisRowActive = useCallback(() => {
    programUP.activeExampleId.$set(example.id);
  }, [example.id, programUP]);

  const { openMenu, menuNode } = useContextMenu(useCallback((closeMenu) =>
    <MyContextMenu>
      <MyContextMenuHeading>Example</MyContextMenuHeading>
      <div>
        <button
          onClick={() => {
            insertExampleAfter();
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
  , [insertExampleAfter, removeExample]));

  return <tr onContextMenu={openMenu} style={{...example.id === activeExampleId && {background: '#eee'}}}>
    {menuNode}
    <td>
      <input
        type="radio"
        checked={example.id === activeExampleId}
        onChange={makeThisRowActive}
      />
    </td>
    {example.values.map((value, i) =>
      <td key={i}>
        <SettableValue value={value} setValue={exampleUP.values[i].$set}/>
      </td>
    )}
    <td>
      <ToolOutputView outputP={outputP}/>
    </td>
  </tr>
});

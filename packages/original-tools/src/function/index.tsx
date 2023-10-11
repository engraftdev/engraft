import { ComputeReferences, EngraftPromise, MakeProgram, ShowView, ToolProgram, ToolProps, ToolResult, ToolRun, ToolView, ToolViewRenderProps, Var, VarBindings, hookRunTool, newVar, randomId, references, slotWithCode } from "@engraft/core";
import { MyContextMenu, MyContextMenuHeading, ToolOutputView, VarDefinition } from "@engraft/core-widgets";
import { useRefunction } from "@engraft/hostkit";
import { hookDedupe, hookFork, hookMemo, hookRefunction, hooks, memoizeProps } from "@engraft/refunc";
import { objEqWithRefEq } from "@engraft/shared/lib/eq.js";
import { difference } from "@engraft/shared/lib/sets.js";
import { useContextMenu } from "@engraft/shared/lib/useContextMenu.js";
import { UpdateProxy } from "@engraft/update-proxy";
import { useUpdateProxy } from "@engraft/update-proxy-react";
import { memo, useCallback, useMemo } from "react";
import { Closure, argValueOutputPsToVarBindings, closureToSyncFunction } from "./closure.js";

export type Program = {
  toolName: 'function',
  argVars: Var[],
  bodyProgram: ToolProgram,
  examples: Example[],
  activeExampleId: string,
}

type Example = {
  id: string,
  argValuePrograms: ToolProgram[],  // parallel with vars
}

export const makeProgram: MakeProgram<Program> = (defaultCode?: string) => {
  const var1 = newVar('input 1')
  const exampleId = randomId();
  return {
    toolName: 'function',
    argVars: [var1],
    bodyProgram: slotWithCode(var1.id),
    examples: [{id: exampleId, argValuePrograms: [slotWithCode('')]}],
    activeExampleId: exampleId,
  }
};

export const computeReferences: ComputeReferences<Program> = (program) =>
  difference(references(program.bodyProgram), program.argVars.map((v) => v.id));

export const run: ToolRun<Program> = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings } = props;
  const { argVars: vars, bodyProgram } = program;

  const closure: Closure = hookDedupe({
    vars,
    bodyProgram,
    closureVarBindings: varBindings,
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
  }), [props, syncFunction]);

  return {outputP, view};
}));


type ViewProps = ToolProps<Program> & ToolViewRenderProps<Program> & {
  syncFunction: (...args: unknown[]) => unknown,
}

const runExampleArgValuePrograms = hooks((example: Example, argVars: Var[], varBindings: VarBindings) => {
  return hookFork((branch) =>
    example.argValuePrograms.map((argValueProgram, i) => branch(argVars[i].id, () =>
      hookRunTool({ program: argValueProgram, varBindings })
    ))
  );
})
const runExamplesArgValuePrograms = hooks((examples: Example[], argVars: Var[], varBindings: VarBindings) => {
  return hookFork((branch) =>
    examples.map((example) => branch(example.id, () =>
      hookRefunction(runExampleArgValuePrograms, example, argVars, varBindings)
    ))
  );
})

const runBodyOnExample = hooks((bodyProgram: ToolProgram, argValueResults: ToolResult<ToolProgram>[], argVars: Var[], varBindings: VarBindings) => {
  const argValueOutputPs = argValueResults.map((result) => result.outputP);
  const bodyVarBindings = {
    ...varBindings,
    ...argValueOutputPsToVarBindings(argValueOutputPs, argVars),
  };
  return hookRunTool({ program: bodyProgram, varBindings: bodyVarBindings})
})
const runBodyOnExamples = hooks((bodyProgram: ToolProgram, examples: Example[], examplesArgValueResults: ToolResult<ToolProgram>[][], argVars: Var[], varBindings: VarBindings) => {
  return hookFork((branch) =>
    examples.map((example, i) => branch(example.id, () =>
      hookRefunction(runBodyOnExample, bodyProgram, examplesArgValueResults[i], argVars, varBindings)
    ))
  );
})

const View = memo((props: ViewProps) => {
  const { program, updateProgram, varBindings, syncFunction } = props;

  const programUP = useUpdateProxy(updateProgram);

  // run all the programs for all the example arg values
  const examplesArgValueResults = useRefunction(runExamplesArgValuePrograms, program.examples, program.argVars, varBindings);

  // run the body on each set of example inputs
  const bodyResults = useRefunction(runBodyOnExamples, program.bodyProgram, program.examples, examplesArgValueResults, program.argVars, varBindings)

  const activeBodyResult = useMemo(() => {
    const activeExampleIdx = program.examples.findIndex((example) => example.id === program.activeExampleId);
    return bodyResults[activeExampleIdx];
  }, [bodyResults, program.activeExampleId, program.examples]);

  return <div className="xCol xGap10 xPad10">
    <div className="xRow xGap10">
      <table>
        <thead>
          <tr>
            <td>{/* for option buttons */}</td>
            {program.argVars.map((var_, i) =>
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
              exampleArgValueResults={examplesArgValueResults[i]}
              bodyResults={bodyResults[i]}
              programUP={programUP}
              numVars={program.argVars.length}
              activeExampleId={program.activeExampleId}
              syncFunction={syncFunction}
            />)}
        </tbody>
      </table>
    </div>

    <div className="xRow xGap10">
      <ShowView view={activeBodyResult.view} updateProgram={programUP.bodyProgram.$apply}/>
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

  const varUP = programUP.argVars[index];

  const insertVarAfter = useCallback(() => {
    programUP.argVars.$helper({$splice: [[index + 1, 0, newVar(`input ${index + 2}`)]]});
    programUP.examples.$all.argValuePrograms.$helper({$splice: [[index + 1, 0, slotWithCode('')]]});
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

  exampleArgValueResults: ToolResult<ToolProgram>[],
  bodyResults: ToolResult<ToolProgram>,

  numVars: number,
  activeExampleId: string,
  syncFunction: (...args: unknown[]) => unknown,
};

const ExampleRow = memo((props: ExampleRowProps) => {
  const { example, index, programUP, exampleArgValueResults, bodyResults, numVars, activeExampleId } = props;

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
      id: randomId(),
      argValuePrograms: Array.from({length: numVars}, () => slotWithCode('')),
    };
    programUP.examples.$helper({$splice: [[index + 1, 0, newExample]]});
    programUP.activeExampleId.$set(newExample.id);
  }, [index, numVars, programUP.activeExampleId, programUP.examples]);

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
    {exampleArgValueResults.map((result, i) =>
      <td key={i}>
        <ShowView view={result.view} updateProgram={exampleUP.argValuePrograms[i].$apply}/>
      </td>
    )}
    <td>
      <ToolOutputView outputP={bodyResults.outputP}/>
    </td>
  </tr>
});

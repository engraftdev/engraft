import { memo, useEffect, useMemo } from "react";
import { hasValue, ProgramFactory, ToolProgram, ToolProps } from "src/tools-framework/tools";
import { ShowView, ToolInSet, useSubTool, useToolSet, useView } from "src/tools-framework/useSubTool";
import { at, useAt, useAts } from "src/util/state";
import { updateF } from "src/util/updateF";
import { FunctionThingComponent, isProbablyFunctionThing } from "./function";
import { slotSetTo } from "./slot";

export type Program = {
  toolName: 'call',
  functionProgram: ToolProgram,
  inputPrograms: {[varId: string]: ToolProgram},
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'call',
  functionProgram: slotSetTo(''),
  inputPrograms: {},
});

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [functionComponent, functionView, functionOutput] = useSubTool({program, updateProgram, subKey: 'functionProgram'});

  const functionThing = useMemo(() => {
    if (!hasValue(functionOutput)) { return null; }
    if (!isProbablyFunctionThing(functionOutput.value)) { return null; }
    return functionOutput.value;
  }, [functionOutput]);

  const [inputPrograms, updateInputPrograms] = useAt(program, updateProgram, 'inputPrograms');
  const inputProgramAts = useAts(inputPrograms, updateInputPrograms);

  const [inputToolSet, inputOutputs, inputViews] = useToolSet();

  useEffect(() => {
    if (!functionThing) { return; }
    const varIds = functionThing.program.vars.map(v => v.id);
    let newInputPrograms = {...program.inputPrograms};
    let changed = false;
    for (const varId of Object.keys(newInputPrograms)) {
      if (!varIds.includes(varId)) {
        delete newInputPrograms[varId];
        changed = true;
      }
    }
    for (const varId of varIds) {
      if (!newInputPrograms[varId]) {
        newInputPrograms[varId] = slotSetTo('');
        changed = true;
      }
    }
    if (changed) {
      updateProgram(updateF({inputPrograms: {$set: newInputPrograms}}));
    }
  }, [functionThing, program, updateProgram]);

  // const [bodyView, setBodyView] = useStateSetOnly<ToolView | null>(null);

  useView(reportView, useMemo(() => ({
    render: () =>
      <div className="xCol xGap10 xPadH10">
        <div className="xRow xGap10">
          <table>
            <tbody>
              <tr>
                <td></td>
                {functionThing?.program.vars.map(v =>
                  <td key={v.id}>
                    <span dangerouslySetInnerHTML={{__html: v.label}} style={{fontSize: '80%'}}/>
                  </td>
                )}
              </tr>
              <tr>
                <td>
                  <ShowView view={functionView} />
                </td>
                {functionThing?.program.vars.map(v =>
                  <td key={v.id}>
                    <ShowView view={inputViews[v.id]} />
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
        {/* <ShowView view={bodyView} /> */}
      </div>
  }), [functionThing?.program.vars, functionView, inputViews]));

  return <>
    {functionComponent}
    {Object.entries(inputProgramAts).map(([varId, [inputProgram, updateInputProgram]]) =>
      <ToolInSet key={varId} toolSet={inputToolSet} keyInSet={varId} program={inputProgram} updateProgram={updateInputProgram} />
    )}
    {functionThing &&
      <FunctionThingComponent
        functionThing={functionThing} inputs={inputOutputs}
        reportOutput={reportOutput}
        // reportView={setBodyView}
      />
    }
  </>
});

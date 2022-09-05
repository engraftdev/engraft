import _ from "lodash";
import React, { memo, useEffect, useMemo } from "react";
import { hasValue, ProgramFactory, ToolProgram, ToolProps } from "src/tools-framework/tools";
import { ShowView, useSubTool, useTools, useView } from "src/tools-framework/useSubTool";
import { at, useAt } from "src/util/state";
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

  const [_inputPrograms, updateInputPrograms] = useAt(program, updateProgram, 'inputPrograms');

  // manage running inputs
  const [inputComponents, inputViews, inputOutputs] = useTools(
    useMemo(() =>
      _.mapValues(program.inputPrograms, (inputProgram, varId) =>
        ({program: inputProgram, updateProgram: at(updateInputPrograms, varId)})
      )
    , [program.inputPrograms, updateInputPrograms])
  );

  useEffect(() => {
    if (!functionThing) { return; }
    const varIds = functionThing.program.vars.map(v => v.id);
    const newInputPrograms = {...program.inputPrograms};
    for (const varId of Object.keys(newInputPrograms)) {
      if (!varIds.includes(varId)) {
        delete newInputPrograms[varId];
      }
    }
    for (const varId of varIds) {
      if (!newInputPrograms[varId]) {
        newInputPrograms[varId] = slotSetTo('');
      }
    }
    updateProgram(updateF({inputPrograms: {$set: newInputPrograms}}));
  }, [functionThing, program, updateProgram]);

  useView(reportView, useMemo(() => ({
    render: () =>
      <div className="xRow xAlignBottom xGap10 xPad10">
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
      </div>
  }), [functionThing, functionView, inputViews]));

  return <>
    {functionComponent}
    {Object.entries(inputComponents).map(([varId, inputComponent]) =>
      <React.Fragment key={varId}>
        {inputComponent}
      </React.Fragment>
    )}
    {functionThing &&
      <FunctionThingComponent functionThing={functionThing} inputs={inputOutputs} reportOutput={reportOutput} />
    }
  </>
});

import { memo, useMemo } from "react";
import { newVar, ProgramFactory, ProvideVarBinding, ToolProgram, ToolProps, Var } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { useAt } from "src/util/state";
import { VarDefinition } from "src/view/Vars";
import { slotSetTo } from "./slot";

export type Program = {
  toolName: 'function';
  argumentVars: Var[];
  argumentSettings: ArgumentSetting[];
  bodyProgram: ToolProgram;
}

type ArgumentSetting = {
  valueExprs: string[];  // parallel with argumentVars
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => {
  const var1 = newVar('input')
  return {
    toolName: 'function',
    argumentVars: [var1],
    argumentSettings: [{valueExprs: ['']}],
    bodyProgram: slotSetTo(var1.id),
  }
};

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [bodyComponent, bodyView, bodyOutput] = useSubTool({program, updateProgram, subKey: 'bodyProgram'});
  const [bindingVar, updateBindingVar] = useAt(program, updateProgram, 'bindingVar');

  useOutput(reportOutput, bodyOutput);

  useView(reportView, useMemo(() => ({
    render: ({autoFocus}) =>
      <div className="xCol xGap10 xPad10">
        <div className="xRow xGap10">
          <b>function</b>
          {<VarDefinition var_={bindingVar} updateVar={updateBindingVar} autoFocus={autoFocus}/>}
        </div>

        <div className="xRow xGap10">
          <b>be</b>
          <ShowView view={bindingView} />
        </div>

        <div className="xRow xGap10">
          <b>in</b>
          <ShowView view={bodyView} />
        </div>
      </div>
  }), [bindingVar, bindingView, bodyView, updateBindingVar]));

  return <>
    {bindingComponent}
    {program.bindingVar ?
      <ProvideVarBinding var_={program.bindingVar} value={bindingOutput || undefined}>
        {bodyComponent}
      </ProvideVarBinding> :
      bodyComponent
    }
  </>
});

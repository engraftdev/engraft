import { memo, useMemo } from "react";
import { newVar, ProgramFactory, ProvideVarBinding, ToolProgram, ToolProps, Var } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { useAt } from "src/util/state";
import { VarDefinition } from "src/view/Vars";
import { slotSetTo } from "./slot";

export type Program = {
  toolName: 'let';
  bindingVar: Var;
  bindingProgram: ToolProgram;
  bodyProgram: ToolProgram;
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => {
  return {
    toolName: 'let',
    bindingVar: newVar(),
    bindingProgram: slotSetTo(''),
    bodyProgram: slotSetTo(''),
  }
};

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [bindingComponent, bindingView, bindingOutput] = useSubTool({program, updateProgram, subKey: 'bindingProgram'});
  const [bodyComponent, bodyView, bodyOutput] = useSubTool({program, updateProgram, subKey: 'bodyProgram'});
  const [bindingVar, updateBindingVar] = useAt(program, updateProgram, 'bindingVar');

  useOutput(reportOutput, bodyOutput);

  useView(reportView, useMemo(() => ({
    render: ({autoFocus}) =>
      <div className="xCol xGap10 xPad10">
        <div className="xRow xGap10">
          <b>let</b>
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
      <ProvideVarBinding var_={program.bindingVar} output={bindingOutput || undefined}>
        {bodyComponent}
      </ProvideVarBinding> :
      bodyComponent
    }
  </>
});

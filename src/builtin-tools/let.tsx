import { memo, useCallback, useEffect } from "react";
import { newVar, ProgramFactory, ProvideVarBinding, ToolProgram, ToolProps, ToolView, Var } from "src/tools-framework/tools";
import { ShowView, useSubTool, useView } from "src/tools-framework/useSubTool";
import { useAt } from "src/util/state";
import { VarDefinition } from "src/view/Vars";
import { codeProgramSetTo } from "./code";

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
    bindingProgram: codeProgramSetTo(''),
    bodyProgram: codeProgramSetTo(''),
  }
};

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [bindingComponent, bindingView, bindingOutput] = useSubTool({program, updateProgram, subKey: 'bindingProgram'});
  const [bodyComponent, bodyView, bodyOutput] = useSubTool({program, updateProgram, subKey: 'bodyProgram'});

  useEffect(() => {
    reportOutput(bodyOutput);
  }, [bodyOutput, reportOutput])

  const [bindingVar, updateBindingVar] = useAt(program, updateProgram, 'bindingVar');

  const view: ToolView = useCallback(({autoFocus}) => (
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
  ), [bindingVar, bindingView, bodyView, updateBindingVar]);
  useView(reportView, view);

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

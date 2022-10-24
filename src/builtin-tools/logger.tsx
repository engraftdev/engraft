import { memo, useMemo } from "react";
import { ProgramFactory, ToolProgram, ToolProps } from "src/tools-framework/tools";
import { useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { slotSetTo } from "./slot";

export type Program = {
  toolName: 'logger',
  label: string,
  actualProgram: ToolProgram,
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'logger',
  label: 'unknown label',
  actualProgram: slotSetTo(''),
});

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, varBindings, reportOutput, reportView } = props;

  const [actualComponent, actualView, actualOutput] = useSubTool({program, updateProgram, subKey: 'actualProgram', varBindings});

  useOutput(reportOutput, useMemo(() => {
    console.log("output changed:", program.label, actualOutput);
    return actualOutput;
  }, [actualOutput, program.label]));

  useView(reportView, useMemo(() => {
    console.log("view changed:", program.label, actualView);
    return actualView;
  }, [actualView, program.label]));

  return <>
    {actualComponent}
  </>
});

export function loggerWrapping(program: ToolProgram, label: string): Program {
  return {
    toolName: 'logger',
    label,
    actualProgram: program,
  };
}

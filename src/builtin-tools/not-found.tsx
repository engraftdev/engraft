import { memo, useMemo } from "react";
import { ProgramFactory, ToolProps } from "src/tools-framework/tools";
import { useOutput, useView } from "src/tools-framework/useSubTool";

export type Program = {
  toolName: 'not-found',
};

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'not-found',
});

export const Component = memo((props: ToolProps<Program>) => {
  const { reportOutput, reportView } = props;

  const { toolName } = props.program;
  const message = `⚠️ Tool not found: ${toolName}`;

  useOutput(reportOutput, useMemo(() => ({
    error: message
  }), [message]));

  useView(reportView, useMemo(() => ({
    render: () => <div>{message}</div>
  }), [message]));

  return <></>;
});

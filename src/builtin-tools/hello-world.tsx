import { memo, useEffect } from "react";
import { ProgramFactory, ToolProps } from "src/tools-framework/tools";

export type Program = {
  toolName: 'hello-world',
};

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'hello-world',
});

export const Component = memo((props: ToolProps<Program>) => {
  const { reportOutput, reportView } = props;

  useEffect(() => {
    reportOutput({
      value: "Output: Hello world!"
    });
    reportView({
      render: () => <h1 style={{fontStyle: 'italic'}}>View: Hello world!</h1>
    });
  }, [reportOutput, reportView])

  return <></>;
});

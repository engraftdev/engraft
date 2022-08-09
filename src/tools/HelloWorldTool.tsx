import { memo, useEffect } from "react";
import { ProgramFactory, ToolProps } from "src/tools-framework/tools";

export type Program = {
  toolName: 'hello-world',
};

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'hello-world',
});

export const Component = memo((props: ToolProps<Program>) => {
  useEffect(() => {
    props.reportOutput({toolValue: "Hello world!"});
    props.reportView(() => <h1>Hello world!</h1>)
  }, [props])

  return <></>;
});

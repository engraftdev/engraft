import { memo, useEffect } from "react";
import { registerTool, ToolProgram, ToolProps } from "src/tools-framework/tools";

export interface HelloWorldProgram extends ToolProgram {
  toolName: 'hello-world';
}

export const HelloWorldTool = memo(function HelloWorldTool(props: ToolProps<HelloWorldProgram>) {
  useEffect(() => {
    props.reportOutput({toolValue: "Hello world!"});
    props.reportView(() => <h1>Hello world!</h1>)
  }, [props])

  return <></>;
});

registerTool<HelloWorldProgram>(HelloWorldTool, 'hello-world', () => ({
  toolName: 'hello-world',
}));

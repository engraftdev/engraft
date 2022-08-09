import { memo, useEffect } from "react";
import { registerTool, ToolConfig, ToolProps } from "src/tools-framework/tools";

export interface HelloWorldConfig extends ToolConfig {
  toolName: 'hello-world';
}

export const HelloWorldTool = memo(function HelloWorldTool(props: ToolProps<HelloWorldConfig>) {
  useEffect(() => {
    props.reportOutput({toolValue: "Hello world!"});
    props.reportView(() => <h1>Hello world!</h1>)
  }, [props])

  return <></>;
});

registerTool<HelloWorldConfig>(HelloWorldTool, 'hello-world', () => ({
  toolName: 'hello-world',
}));

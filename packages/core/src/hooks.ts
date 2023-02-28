import { hookDedupe, hookFork, hookIncr, hookMemo, hooks } from "@engraft/incr";
import { objEqWithRefEq } from "@engraft/shared/src/eq";
import { lookUpTool, references, ToolProgram, ToolProps, ToolResult as ToolResults, VarBindings } from "./core";

export function hookRunTool<P extends ToolProgram>(props: ToolProps<P>): ToolResults {
  const toolName = props.program.toolName;
  const tool = lookUpTool(toolName);

  // Run in a branch keyed by the toolName, so that a new memory is used if toolName changes
  // TODO: hookKeyed?
  return hookFork((branch) =>
    branch(toolName, () => {
      return hookIncr(tool.run, props);
    })
  );
}

// TODO: does this belong here?
export const runTool = hooks(hookRunTool);

export function hookRelevantVarBindings(props: ToolProps<any>) {
  const refs = hookMemo(() => {
    return references(props.program);
  }, [props.program]);

  const relevantVarBindings = hookMemo(() => {
    const result: VarBindings = {};
    for (const ref of refs) {
      result[ref] = props.varBindings[ref];
    }
    return hookDedupe(result, objEqWithRefEq);
  }, [refs, props.varBindings]);

  return relevantVarBindings;
}

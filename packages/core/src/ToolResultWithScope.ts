import { hookMemo, hooks } from "@engraft/refunc";
import { ToolProgram, ToolProps, ToolResult, VarBindings } from "./core.js";
import { hookRunTool } from "./runTool.js";

// This is a utility for keeping track of a tool that is run with newly provided
// var bindings, so the new var bindings can also be provided when the tool's
// view is rendered.

// It's not great, but it's helped so far.

export type ToolResultWithScope<P extends ToolProgram = ToolProgram> = {
  result: ToolResult<P>,
  newScopeVarBindings: VarBindings,
}

export function hookRunToolWithNewVarBindings<P extends ToolProgram>(
  props: Omit<ToolProps<P>, 'varBindings'> & { varBindings?: VarBindings, newVarBindings: VarBindings }
): ToolResultWithScope<P> {
  const allVarBindings = hookMemo(() => ({
    ...props.varBindings,
    ...props.newVarBindings,
  }), [props.varBindings, props.newVarBindings]);

  const result = hookRunTool({...props, varBindings: allVarBindings});

  return { result, newScopeVarBindings: props.newVarBindings };
}

export const runToolWithNewVarBindings = hooks(hookRunToolWithNewVarBindings);

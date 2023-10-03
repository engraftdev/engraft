import { hookDedupe, hookFork, hookMemo, hookRefunction, hooks } from "@engraft/refunc/lib/index.js";
import { objEqWithRefEq } from "@engraft/shared/lib/eq.js";
import { ToolProgram, ToolProps, ToolResult as ToolResults, VarBindings } from "./core.js";
import { debugMode, dispatcher, references } from "./globals.js";

export function hookRunTool<P extends ToolProgram>(
  props: ToolProps<P>
): ToolResults<P> {
  const toolName = props.program.toolName;
  const tool = dispatcher().lookUpToolByProgram(props.program);

  // A tool only receives the varBindings that it references
  const varBindings = hookRelevantVarBindings(props);

  if (debugMode()) { console.group(`running ${toolName}`); }
  try {
    // Run in a branch keyed by the toolName, so that a new memory is used if toolName changes
    return hookFork((branch) => branch(toolName, () =>
      hookRefunction(tool.run, {...props, varBindings})
    ));
  } finally {
    if (debugMode()) { console.groupEnd(); }
  }
}

export const runTool = hooks(hookRunTool);

function hookRelevantVarBindings(props: ToolProps<any>) {
  const refs = references(props.program);  // cached in a weak-map so no memo
  const relevantVarBindings = hookMemo(() => {
    const result: VarBindings = {};
    for (const ref of refs) {
      result[ref] = props.varBindings[ref];
    }
    return hookDedupe(result, objEqWithRefEq);
  }, [refs, props.varBindings]);

  return relevantVarBindings;
}

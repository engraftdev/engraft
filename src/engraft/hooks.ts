import { hookFork, hookMento, hooks } from "src/mento/hooks";
import { Updater } from "src/util/immutable";
import { hookAt } from "src/util/immutable-mento";
import { lookUpTool, ToolProgram, ToolProps, ToolResult as ToolResults, VarBindings } from ".";

export function hookRunTool<P extends ToolProgram>(props: ToolProps<P>): ToolResults {
  const toolName = props.program.toolName;
  const tool = lookUpTool(toolName);

  // Run in a branch keyed by the toolName, so that a new memory is used if toolName changes
  // TODO: hookKeyed?
  return hookFork((branch) =>
    branch(toolName, () => {
      return hookMento(tool.run, props);
    })
  );
}

// TODO: does this belong here?
export const runTool = hooks(hookRunTool);

// for the common case where a tool's program is a key in a super-tool's program

export interface UseSubToolProps<P, K extends keyof P> {
  program: P,
  updateProgram: Updater<P>,
  subKey: K,
  varBindings: VarBindings,
}

// TODO: doesn't check that the sub-program is actually a toolprogram! dang typing

export function hookRunSubTool<P, K extends string & keyof P>(props: UseSubToolProps<P, K>) {
  const {program, updateProgram, subKey, varBindings} = props;

  const [subProgram, updateSubProgram] = hookAt(program, updateProgram, subKey);

  return hookRunTool<any>({
    program: subProgram,
    updateProgram: updateSubProgram,
    varBindings,
  })
}

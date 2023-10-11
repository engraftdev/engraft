import { EngraftPromise, runTool, ToolOutput, ToolProgram, Var, VarBindings } from "@engraft/core";
import { RefuncMemory } from "@engraft/refunc";

export type Closure = {
  vars: Var[],
  bodyProgram: ToolProgram,
  closureVarBindings: VarBindings,
}

export function argValueOutputPsToVarBindings(argValueOutputPs: EngraftPromise<ToolOutput>[], vars: Var[]): VarBindings {
  const varBindings: VarBindings = {};
  for (let i = 0; i < vars.length; i++) {
    varBindings[vars[i].id] = {
      var_: vars[i],
      outputP: argValueOutputPs[i],
    }
  }
  return varBindings;
}

export function argValuesToVarBindings(values: unknown[], vars: Var[]): VarBindings {
  return argValueOutputPsToVarBindings(values.map(value => EngraftPromise.resolve({value})), vars);
}

export function closureToSyncFunction(closure: Closure) {
  const {vars, bodyProgram, closureVarBindings} = closure;
  return (...args: unknown[]) => {
    if (args.length < vars.length) {
      throw new Error(`Expected ${vars.length} arguments, got ${args.length}`);
    }

    const varBindings = argValuesToVarBindings(args, vars);

    const result = runTool(
      new RefuncMemory(),  // no incrementality
      {
        program: bodyProgram,
        varBindings: {
          ...closureVarBindings,
          ...varBindings,
        },
      }
    );
    const outputState = EngraftPromise.state(result.outputP);
    if (outputState.status === 'fulfilled') {
      return outputState.value.value;
    } else if (outputState.status === 'rejected') {
      throw outputState.reason;
    } else {
      throw new Error('Function did not return synchronously');
    }
  }
}

import { EngraftPromise, RefuncMemory, runTool, ToolOutput, ToolProgram, Var, VarBindings } from "@engraft/toolkit";

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

export function closureToAsyncFunction(closure: Closure) {
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

    return result.outputP.then((output) => output.value);
  }
}

export function closureToSyncFunction(closure: Closure) {
  const asyncFunction = closureToAsyncFunction(closure);
  return (...args: unknown[]) => {
    const valueP = asyncFunction(...args);

    const valueState = EngraftPromise.state(valueP);
    if (valueState.status === 'fulfilled') {
      return valueState.value;
    } else if (valueState.status === 'rejected') {
      throw valueState.reason;
    } else {
      throw new Error('Function did not return synchronously');
    }
  }
}

import { ToolProgram, Var, VarBindings } from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { runTool } from "src/engraft/hooks";
import { Incr } from "src/incr";

export type Closure = {
  vars: Var[],
  bodyProgram: ToolProgram,
  closureVarBindings: VarBindings,
}

export function valuesToVarBindings(values: unknown[], vars: Var[]): VarBindings {
  const varBindings: VarBindings = {};
  for (let i = 0; i < vars.length; i++) {
    varBindings[vars[i].id] = {
      var_: vars[i],
      outputP: EngraftPromise.resolve({value: values[i]}),
    }
  }
  return varBindings;
}

export function closureToSyncFunction(closure: Closure) {
  const {vars, bodyProgram, closureVarBindings} = closure;
  return (...args: unknown[]) => {
    if (args.length < vars.length) {
      throw new Error(`Expected ${vars.length} arguments, got ${args.length}`);
    }

    const varBindings = valuesToVarBindings(args, vars);

    const result = runTool(
      Incr.createMemory(),  // no incrementality
      {
        program: bodyProgram,
        varBindings: {
          ...closureVarBindings,
          ...varBindings,
        },
        updateProgram: () => { throw new Error(`Cannot update program in closure`); },
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

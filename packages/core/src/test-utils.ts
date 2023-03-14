import { ToolOutput, VarBindings } from "./index.js";
import { EngraftPromise } from "./EngraftPromise.js";

export function makeVarBindings(values: {[name: string]: ToolOutput | EngraftPromise<ToolOutput>}): VarBindings {
  const bindings: VarBindings = {};
  for (const name of Object.keys(values)) {
    bindings[name] = {
      var_: {id: name, label: name},
      outputP: EngraftPromise.resolve(values[name]),
    };
  }
  return bindings;
}

import { VarBinding } from "@engraft/core";

let get_json = false;

export function varBindingsObject(varBindings: VarBinding[]) {
  return Object.fromEntries(
    varBindings.map((varBinding) => [varBinding.var_.id, varBinding])
  );
}

export function valueFromStdin(input: string) {
  // try to JSON parse it
  try {
    return JSON.parse(input);
  } catch (e) {}

  // otherwise, trim off whitespace and return it as lines
  return input.trim().split("\n");
}

export function set_json() {
  console.error("SET_JSON");
  get_json = true;
}

export function valueToStdout(value: any) {
  console.error("JSON_ONLY", get_json);
  if (!get_json) {
    // return it raw if it's a string
    if (typeof value === "string") {
      return value;
    }

    // return it as lines if it's an array
    if (Array.isArray(value)) {
      // string lines are raw, other lines are JSON
      const lines = value.map((line) => {
        if (typeof line === "string") {
          return line;
        }
        return JSON.stringify(line);
      });
      return lines.join("\n");
    }
  }
  // otherwise, return it as JSON
  return JSON.stringify(value, null, 2);
}

import { VarBinding } from "@engraft/hostkit";
import { loadPyodide } from 'pyodide';

let _pyodide: any = undefined;

export function varBindingsObject(varBindings: VarBinding[]) {
  return Object.fromEntries(varBindings.map((varBinding) => [varBinding.var_.id, varBinding]));
}

async function getPyodide() {
  if (_pyodide === undefined) {
    _pyodide = await loadPyodide();
    await _pyodide.loadPackage("numpy");
  }
  return _pyodide;
}

function customReviver(key : string, value: any) {
  if (typeof value === 'object' && value !== null && '__type' in value) {
    switch (value.__type) {
      case 'nd-array':
        (async () => {
          let code = value.__value;
          const pyodide = await getPyodide();
          const result = await pyodide.runPythonAsync(
            code,
          );
          return result;
        })();
        break;
      default:
        // in case we run into other custom types
        return value.__value;
    }
  }
  return value;
}

export function valueFromStdin(input: string) {
  // try to JSON parse it
  try {
    return JSON.parse(input, customReviver);
  } catch (e) { }

  // otherwise, trim off whitespace and return it as lines
  return input.trim().split("\n");
}

export function valueToStdout(value: any, jsonOnly=false) {
  if (!jsonOnly) {
    // return it raw if it's a string
    if (typeof value === 'string') {
      return value;
    }

    // return it as lines if it's an array
    if (Array.isArray(value)) {
      // string lines are raw, other lines are JSON
      const lines = value.map((line) => {
        if (typeof line === 'string') {
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
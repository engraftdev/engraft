import { VarBinding } from "@engraft/hostkit";
import type { PyodideInterface } from "pyodide/pyodide.js";

let _pyodide: PyodideInterface | undefined = undefined;

export function varBindingsObject(varBindings: VarBinding[]) {
  return Object.fromEntries(varBindings.map((varBinding) => [varBinding.var_.id, varBinding]));
}

async function getPyodide() {
  if (_pyodide === undefined) {
    const pyodideModule = await import("pyodide/pyodide.js")
    _pyodide = await pyodideModule.loadPyodide() as PyodideInterface;
    await _pyodide.loadPackage("numpy");
  }
  return _pyodide;
}

async function traverseObject(obj : any) {
  const keys = Object.keys(obj);
  console.error("keys", keys)
  let prevType = "";
  for (const key of keys) {
    if (key === '__type') {
      if (obj[key] === 'nd-array') {
        prevType = 'nd-array'
      } else {
        prevType = 'other'
      }
    }
    else if (key === '__value') {
      let val = obj[key];
      if (prevType === "nd-array") {
        console.error("Val", val);
        const pyodide = await getPyodide();
        console.log('customReviver: pyodide:', pyodide, 'code:', val);
        const result = await pyodide.runPythonAsync('np.array(' + JSON.stringify(val) + ')');
        console.log('customReviver: result:', result);
        obj[key] = result;
      }
    }
  }
  return obj;
}

export async function valueFromStdin(input : string) {
  console.log('valueFromStdin called with input:', input);

  try {
    const parsed = JSON.parse(input);
    console.log('valueFromStdin: input is JSON, parsed:', parsed);
    const revived = await traverseObject(parsed);
    console.log('valueFromStdin: revived:', revived);
    return revived;
  } catch (e) {
    console.error('valueFromStdin: JSON.parse failed:', e);
    return input.trim().split("\n");
  }
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
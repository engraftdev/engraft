import { VarBinding } from "@engraft/hostkit";
import { PyodideInterface } from "pyodide/pyodide.js";

let _pyodide: PyodideInterface | undefined = undefined;

export function varBindingsObject(varBindings: VarBinding[]) {
  return Object.fromEntries(varBindings.map((varBinding) => [varBinding.var_.id, varBinding]));
}

async function getPyodide() {
  if (_pyodide === undefined) {
    const isNode = (globalThis as any)?.process?.release?.name === 'node';
    const pyodideModule = isNode
      ? await import("pyodide/pyodide.js")
      // @ts-ignore
      : await import("https://cdn.jsdelivr.net/pyodide/v0.23.1/full/pyodide.mjs");
    _pyodide = await pyodideModule.loadPyodide() as PyodideInterface;
    await _pyodide.loadPackage("numpy");
  }
  return _pyodide;
}

async function reviveIn(obj : any) {
  const keys = Object.keys(obj);
  let prevType = "";
  let ret = [];
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
        const pyodide = await getPyodide();
        const _ = await pyodide.runPythonAsync('import numpy as np');
        const result = await pyodide.runPythonAsync('np.array(' + JSON.stringify(val) + ')');
        ret.push(result);
      }
    } else {
      ret.push(obj[key]);
    }
  }
  if (ret.length === 1) {
    return ret[0];
  }
  return ret;
}

export async function valueFromStdin(input : string) {
  try {
    const parsed = JSON.parse(input);
    const revived = await reviveIn(parsed);
    return revived;
  } catch (e) {
    return input.trim().split("\n");
  }
}

export function valueToStdout(value: any, jsonOnly=false) {
  //iterate through value, printing the type of each element
  for (const element of value) {
    console.log(typeof element);
  }

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

// todos
// write backward pass of reviver (need to figure out how to detect from outputs of engraft)
// fix pyproxy stuff
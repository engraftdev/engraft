/// <reference path="./shared.d.ts" />
import { VarBinding } from "@engraft/hostkit";
import type { PyodideInterface } from "pyodide/pyodide.js";

let _pyodide: PyodideInterface | undefined = undefined;

export function varBindingsObject(varBindings: VarBinding[]) {
  return Object.fromEntries(varBindings.map((varBinding) => [varBinding.var_.id, varBinding]));
}

async function getPyodide() {
  if (_pyodide === undefined) {
    const isNode = (globalThis as any)?.process?.release?.name === 'node';
    const pyodideModule = isNode
      ? await import("pyodide/pyodide.js")
      : await import("https://cdn.jsdelivr.net/pyodide/v0.23.1/full/pyodide.mjs");
    _pyodide = await pyodideModule.loadPyodide() as PyodideInterface;
    await _pyodide.loadPackage("numpy");
  }
  return _pyodide;
}

async function reviveIn(obj : any) : Promise<any> {
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
        const result = await pyodide.runPythonAsync('import numpy as np; np.array(input)', { globals: pyodide.toPy({input: val})});
        console.log("type of result", typeof result);
        ret.push(result);
      }
    } else if (typeof obj[key] === 'object') {
      ret.push(await reviveIn(obj[key]));
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

async function reviveOut(value : any) {
  const pyodide = await getPyodide();
  if (value instanceof pyodide.ffi.PyProxy) {
    return {__type: value.__type, __value: value.__repr__()};
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = await reviveOut(value[i]);
    }
    return value;
  } else {
    return value;
  }
}
// need to fix pyproxy not working in python cell (can't see type of python array if calling repr)

export async function valueToStdout(value: any, jsonOnly=false) {
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
  value = await reviveOut(value);
  console.log("received value", value)
  console.log("stringified", JSON.stringify(value))
  return JSON.stringify(value, null, 2);
}
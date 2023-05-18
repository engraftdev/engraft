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
  if (Array.isArray(obj)) {
    return Promise.all(obj.map(reviveIn));
  } else if (typeof obj === 'object') {
    if (obj.__type === 'nd-array') {
      const pyodide = await getPyodide();
      return await pyodide.runPythonAsync('import numpy as np; np.array(input)', { globals: pyodide.toPy({input: obj.__value})});
    } else {
      const newValue : any = {};
      for (const key in obj) {
        newValue[key] = await reviveIn(obj[key]);
      }
      return newValue; 
    }
  }
  return obj;
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

async function reviveOut(value : any) : Promise<any> {
  const pyodide = await getPyodide();
  if (value instanceof pyodide.ffi.PyProxy) {
    if (value.type === 'numpy.ndarray') {
      return { __type: 'nd-array', __value: value.toJs() }; // todo: can use repr here instead
    }
  } else if (Array.isArray(value)) {
    return Promise.all(value.map(reviveOut));
  }
  return value; 
}

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
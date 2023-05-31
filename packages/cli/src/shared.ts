import { VarBinding } from "@engraft/hostkit";
import { getPyodide } from  "@engraft/pyodide";

export function varBindingsObject(varBindings: VarBinding[]) {
  return Object.fromEntries(varBindings.map((varBinding) => [varBinding.var_.id, varBinding]));}

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

function hasCircularReference(obj : any) {
  const visited = new Set();
  function traverse(obj : any) {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }
    if (visited.has(obj)) {
      return true;
    }
    visited.add(obj);
    for (const key in obj) {
      if (traverse(obj[key])) {
        return true;
      }
    }
    visited.delete(obj);
    return false;
  }
  return traverse(obj);
}

async function prepareForStringify(value : any) : Promise<any> {
  if (Array.isArray(value)) {
    return Promise.all(value.map(prepareForStringify));
  } else if (typeof value === 'object') {
    if (value.constructor.name === 'PyProxy') {
      const pyodide = await getPyodide();
      if (value.type === 'numpy.ndarray') {
         value = await pyodide.runPythonAsync('input.tolist()', { globals: pyodide.toPy({input: value})});
         return { __type: 'nd-array', __value: value.toJs() };
      }
      return value.toJs();
    } else {
      const newValue : any = {};
      for (const key in value) {
        newValue[key] = await prepareForStringify(value[key]);
      }
      return newValue;
    }
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
  if (hasCircularReference(value)) {
    return "Circular reference detected.";
  }
  value = await prepareForStringify(value);
  return JSON.stringify(value, null, 2);
}
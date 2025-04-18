/// <reference path="./index.d.ts" />
import type { PyodideInterface } from "pyodide/pyodide.js";

let _pyodide: PyodideInterface | undefined = undefined;

export async function getPyodide() : Promise<PyodideInterface> {
    if (_pyodide === undefined) {
      const isNode = (globalThis as any)?.process?.release?.name === 'node';
      const pyodideModule = isNode
        ? await import("pyodide/pyodide.js")
        : await import("https://cdn.jsdelivr.net/pyodide/v0.23.1/full/pyodide.mjs");
      _pyodide = await pyodideModule.loadPyodide() as PyodideInterface;
      const originalConsoleLog = console.log;
      console.log = () => {};
      await _pyodide.loadPackage("numpy");
      console.log = originalConsoleLog;
    }
    return _pyodide;
}

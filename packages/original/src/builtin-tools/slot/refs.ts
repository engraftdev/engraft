import { idRegExp } from "../../util/id.js";

export function refCode(s: string) {
  // currently, the id of a reference is just embedded directly into code
  return s;
}

export const refREAll = new RegExp(refCode(`(${idRegExp})`), "g")

export const refREDirect = new RegExp(refCode(`(${idRegExp})(?!_)`), "g")
export function referencesFromCodeDirect(code: string): Set<string> {
  // TODO: this is not principled or robust; should probably actually parse the code?
  // (but then we'd want to share some work to avoid parsing twice? idk)
  return new Set([...code.matchAll(refREDirect)].map(m => m[1]));
}

export const refREPromise = new RegExp(refCode(`(${idRegExp})_promise`), "g")
export function referencesFromCodePromise(code: string): Set<string> {
  // TODO: this is not principled or robust; should probably actually parse the code?
  // (but then we'd want to share some work to avoid parsing twice? idk)
  return new Set([...code.matchAll(refREPromise)].map(m => m[1]));
}

import { idRegExp } from "src/util/id";

export function refCode(s: string) {
  // currently, the id of a reference is just embedded directly into code
  return s;
}
export const refRE = new RegExp(refCode(`(${idRegExp})`), "g")

export function referencesFromCode(code: string): Set<string> {
  // TODO: this is not principled or robust; should probably actually parse the code?
  // (but then we'd want to share some work to avoid parsing twice? idk)
  return new Set([...code.matchAll(refRE)].map(m => m[1]));
}

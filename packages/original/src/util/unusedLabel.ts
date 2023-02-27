import _ from "lodash";

const letters = _.range(65, 91).map((n) => String.fromCharCode(n));
export const alphaLabels = [
  ...letters,
  ...letters.flatMap((a) => letters.map((b) => a + b)),
];

export function unusedLabel(labels: string[], usedLabels: string[]): string | undefined;
export function unusedLabel(labels: string[], usedLabels: { [key: string]: unknown }): string | undefined;
export function unusedLabel(labels: string[], usedLabels: string[] | { [key: string]: unknown }) {
  if (Array.isArray(usedLabels)) {
    return unusedLabel(labels, Object.fromEntries(usedLabels.map((label) => [label, true])));
  } else {
    return labels.find((label) => !(label in usedLabels));
  }
}

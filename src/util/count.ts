export function count(num: number, singular: string, plural: string) {
  return num + ' ' + (num === 1 ? singular : plural);
}
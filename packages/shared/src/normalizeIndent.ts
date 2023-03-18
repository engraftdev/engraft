import { assert } from "./assert.js";

function noop(strings: TemplateStringsArray, ...expressions: unknown[]): string {
  let result = strings[0];

  for (let i = 1, l = strings.length; i < l; i++) {
    result += expressions[i - 1];
    result += strings[i];
  }

  return result;
};

export function normalizeIndent(strings: TemplateStringsArray, ...expressions: unknown[]) {
  const text = noop(strings, ...expressions);
  let textLines = text.split('\n');
  assert(textLines[0] === '', 'newline right after opening backtick please');
  textLines = textLines.slice(1);
  assert(textLines[textLines.length - 1].match(/^\s*$/) !== null, 'no non-whitespace on closing backtick line please');
  textLines = textLines.slice(0, textLines.length - 1);
  const leftPadding = Math.min(...textLines.map(line => line.match(/^\s*/)![0].length));
  return textLines.map(line => line.slice(leftPadding)).join('\n') + '\n';
}

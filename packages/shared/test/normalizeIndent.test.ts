import { describe, expect, it } from "vitest";
import { normalizeIndent } from "../lib/normalizeIndent.js";


describe('normalizeIndent', () => {
  it('basically works', () => {
    expect(normalizeIndent`
      a
      b
    `).toBe('a\nb\n');

    expect(normalizeIndent`
      a
        b
    `).toBe('a\n  b\n');

    expect(normalizeIndent`
        a
      b
    `).toBe('  a\nb\n');
  });

  it('is strict about first and last lines', () => {
    expect(() => {
      normalizeIndent`extra
        a
      `;
    }).toThrow();

    expect(() => {
      normalizeIndent`
        a
      extra`;
    }).toThrow();
  });
});

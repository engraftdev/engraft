import { describe, expect, it } from "vitest";
import { compileExpression } from "../../../lib/util/compile.js";
import { runToCompletion } from "../../../lib/util/Task.js";
import { synthesizeGen } from "../../../lib/builtin-tools/synthesizer/synthesizer.js";

describe('synthesizeGen', () => {
  it('synthesizes "adding one"', () => {
    const prompt: [any, any][] = [
      [10, 11],
      [100, 101],
    ];

    const result = runToCompletion(synthesizeGen(prompt));
    expect(
      compileExpression(result!)({input: 1000})
    ).toEqual(1001);
  });

  it('synthesizes "first letters', () => {
    const prompt: [any, any][] = [
      ["George Washington Carver", ["G", "W", "C"]],
      ["David Attenborough", ["D", "A"]],
    ];

    const result = runToCompletion(synthesizeGen(prompt));
    expect(
      compileExpression(result!)({input: "Herbie Hancock"})
    ).toEqual(["H", "H"]);
  });
});

import { describe, expect, it } from 'vitest';
import { compileExpression } from '../../../dist/util/compile';
import { runToCompletion } from '../../../dist/util/Task';
import { synthesizeGen } from '../../../dist/builtin-tools/synthesizer/synthesizer';

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

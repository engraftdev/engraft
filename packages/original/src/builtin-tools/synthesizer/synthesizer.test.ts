import { describe, it } from 'vitest';
import { compileExpression } from '../../util/compile';
import { expectToEqual } from '../../util/expectToEqual';
import { runToCompletion } from '../../util/Task';
import { synthesizeGen } from './synthesizer';

describe('synthesizeGen', () => {
  it('synthesizes "adding one"', () => {
    const prompt: [any, any][] = [
      [10, 11],
      [100, 101],
    ];

    const result = runToCompletion(synthesizeGen(prompt));
    expectToEqual(
      compileExpression(result!)({input: 1000}),
      1001,
    );
  });

  it('synthesizes "first letters', () => {
    const prompt: [any, any][] = [
      ["George Washington Carver", ["G", "W", "C"]],
      ["David Attenborough", ["D", "A"]],
    ];

    const result = runToCompletion(synthesizeGen(prompt));
    expectToEqual(
      compileExpression(result!)({input: "Herbie Hancock"}),
      ["H", "H"],
    );
  });
});

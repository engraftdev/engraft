import { describe, it } from 'vitest';
import { compileExpression } from '../../../src/util/compile';
import { expectToEqual } from '@engraft/test-shared/src/expectToEqual';
import { runToCompletion } from '../../../src/util/Task';
import { synthesizeGen } from '../../../src/builtin-tools/synthesizer/synthesizer';

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
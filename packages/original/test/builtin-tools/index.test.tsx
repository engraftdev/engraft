import { describe, expect, it } from 'vitest';
import { builtinTools } from '../../dist/builtin-tools';

describe('builtinTools', () => {
  it('there are some', () => {
    expect(builtinTools.length).toBeGreaterThan(5);
  });
});

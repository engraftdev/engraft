import { describe, expect, it } from 'vitest';
import { isObject } from '../lib/isObject';

describe('isObject', () => {
  it('basically works', () => {
    expect(isObject({})).toBe(true);
    expect(isObject([])).toBe(true);
    expect(isObject(() => {})).toBe(false);
    expect(isObject(null)).toBe(false);
    expect(isObject(undefined)).toBe(false);
    expect(isObject(123)).toBe(false);
    expect(isObject('abc')).toBe(false);
    expect(isObject(true)).toBe(false);
  });
});

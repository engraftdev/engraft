import { expect } from '@jest/globals';

// wrappers with better typing

export function expectToEqual<T>(actual: T, expected: T) {
  fixStackTrace(expectToEqual, () => {
    expect(actual).toEqual(expected)
  });
}

export function expectToNotEqual<T>(actual: T, expected: T) {
  fixStackTrace(expectToNotEqual, () => {
    expect(actual).not.toEqual(expected);
  });
}

function fixStackTrace(wrapper: Function, f: () => void) {
  try {
    f();
  } catch (error) {
    Error.captureStackTrace(error as object, wrapper);
    throw error;
  }
}

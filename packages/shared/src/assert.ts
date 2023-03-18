export function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

export function assertNever(_never: never, message?: string): never {
  throw new Error(message || `Reached unreachable code: unexpected value ${_never}`);
}

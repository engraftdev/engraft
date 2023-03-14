export function noOp () {
  return;
}

export function identity<T>(x: T): T {
  return x;
}

export const empty = Object.freeze({});

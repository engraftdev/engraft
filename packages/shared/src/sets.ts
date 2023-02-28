// adapted from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set

export function union<T>(...as: Iterable<T>[]): Set<T> {
  const _union = new Set<T>();
  for (const a of as) {
    for (const elem of a) {
      _union.add(elem);
    }
  }
  return _union;
}

export function intersection<T>(a: Iterable<T>, b: Iterable<T>): Set<T> {
  const _intersection = new Set<T>();
  const aSet = a instanceof Set ? a as Set<T> : new Set(a);
  for (const elem of b) {
    if (aSet.has(elem)) {
      _intersection.add(elem);
    }
  }
  return _intersection;
}

export function symmetricDifference<T>(a: Iterable<T>, b: Iterable<T>): Set<T> {
  const _difference = new Set<T>(a);
  for (const elem of b) {
    if (_difference.has(elem)) {
      _difference.delete(elem);
    } else {
      _difference.add(elem);
    }
  }
  return _difference;
}

export function difference<T>(a: Iterable<T>, b: Iterable<T>): Set<T> {
  const _difference = new Set<T>(a);
  for (const elem of b) {
    _difference.delete(elem);
  }
  return _difference;
}

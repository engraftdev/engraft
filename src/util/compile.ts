export function compileExpression(exprCode: string): (context: object) => unknown {
  // eslint-disable-next-line no-new-func
  return new Function('__context__', `with (__context__) { return (${exprCode}); }`) as any
}

// TODO: this will just fill up; should we use TTL?
const _cache: {[exprCode: string]: ((context: object) => unknown) | {error: string}} = {};
export function compileExpressionCached(exprCode: string): ((context: object) => unknown) | {error: string} {
  if (!_cache[exprCode]) {
    try {
      _cache[exprCode] = compileExpression(exprCode);
    } catch (e) {
      _cache[exprCode] = {error: (e as any).toString()};
    }
  }
  return _cache[exprCode];
}

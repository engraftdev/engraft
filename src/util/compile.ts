export function compileExpression(exprCode: string): (context: object) => unknown {
  // eslint-disable-next-line no-new-func
  return new Function('__context__', `with (__context__) { return (${exprCode}); }`) as any
}

// TODO: this will just fill up; should we use TTL?
const _cache: {[exprCode: string]: (context: object) => unknown} = {};
export function compileExpressionCached(exprCode: string): (context: object) => unknown {
  if (!_cache[exprCode]) {
    _cache[exprCode] = compileExpression(exprCode);
  }
  return _cache[exprCode];
}

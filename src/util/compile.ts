export function compileExpression(exprCode: string): (context: object) => unknown {
  // eslint-disable-next-line no-new-func
  return new Function('__context__', `with (__context__) { return (${exprCode}); }`) as any
}

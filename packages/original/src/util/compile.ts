import { cache } from "@engraft/shared/dist/cache";

export function compileExpression(exprCode: string): (context: object) => unknown {
  // eslint-disable-next-line no-new-func
  return new Function('__context__', `with (__context__) { return (${exprCode}); }`) as any
}

export const compileExpressionCached = cache(compileExpression);

export function compileBody(body: string): (context: object) => unknown {
  // eslint-disable-next-line no-new-func
  return new Function('__context__', `with (__context__) { ${body} }`) as any
}

export const compileBodyCached = cache(compileBody);

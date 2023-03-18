// The built-in types for Array.isArray says it returns any[], which is not great.

export function isArray(x: unknown): x is unknown[] {
  return Array.isArray(x);
}

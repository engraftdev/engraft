export function safeToString(x: unknown): string | undefined {
  return (typeof x === 'object' && x !== null && x.toString()) || undefined;
}

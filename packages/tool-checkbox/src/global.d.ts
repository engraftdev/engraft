// TODO: figure out how to not have to copy this from @engraft/original

declare module 'friendly-words' {
  const objects: string[];
}

declare module 'isoformat' {
  export function format(date: Date, orElse: string): string
}

// TODO: it sucks that we need to copy this from @engraft/original... idk

declare module 'friendly-words' {
  const objects: string[];
}

declare module 'isoformat' {
  export function format(date: Date, orElse: string): string
}

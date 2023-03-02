declare module "*.css?inline" {
  const content: string;
  export default content;
}

declare module 'friendly-words' {
  const objects: string[];
}

declare module 'isoformat' {
  export function format(date: Date, orElse: string): string
}

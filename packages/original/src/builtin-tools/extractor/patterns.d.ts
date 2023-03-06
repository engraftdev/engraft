declare module 'internmap' {
  export class InternMap<K, V> extends Map<K, V> {
    constructor(entries?: readonly (readonly [K, V])[] | null, key?: (key: string) => any)
  }
}

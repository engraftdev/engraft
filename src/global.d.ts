// we're not using style-loader
declare module "*.css" {
  const content: string;
  export default content;
}

declare module 'friendly-words' {
  const objects: string[];
}

declare module 'rect-connect' {
  interface Point {x: number, y: number}
  interface Size {width: number, height: number}
  export default function rectConnect(sourceCenter: Point, sourceSize: Size, targetCenter: Point, targetSize: Size): {source: Point, target: Point}
}

declare module '@babel/preset-react' {
  import { PluginItem } from '@babel/core';
  const babelPresetReact: PluginItem
  export = babelPresetReact;
}

declare module 'internmap' {
  export class InternMap<K, V> extends Map<K, V> {
    constructor(entries?: readonly (readonly [K, V])[] | null, key?: (key: string) => any)
  }
}

declare module '@observablehq/inspector' {
  export class Inspector {
    constructor(elem: HTMLElement)
    fulfilled(value: any)
  }
}

declare module 'isoformat' {
  export function format(date: Date, orElse: string)
}

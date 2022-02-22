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
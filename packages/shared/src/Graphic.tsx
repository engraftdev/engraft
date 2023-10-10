import { memo, useState } from "react";
import { Matrix } from "./geom.js";

// a graphic is, like, a picture
// it has an "origin" at (0,0)
// it has a bounding box
// we use CS convention: y goes down

export abstract class Graphic {
  _fill?: string;
  _stroke?: string;

  abstract xl: number;
  abstract xr: number;
  abstract yt: number;
  abstract yb: number;
  abstract render(context: GraphicContext): JSX.Element;

  width() { return this.xr - this.xl; }
  height() { return this.yb - this.yt; }

  xlWithOrigin() { return Math.min(this.xl, 0); }
  xrWithOrigin() { return Math.max(this.xr, 0); }
  ytWithOrigin() { return Math.min(this.yt, 0); }
  ybWithOrigin() { return Math.max(this.yb, 0); }
  widthWithOrigin() { return this.xrWithOrigin() - this.xlWithOrigin(); }
  heightWithOrigin() { return this.ybWithOrigin() - this.ytWithOrigin(); }

  fill(color: string): Graphic {
    let graphic = new With([this]);
    graphic._fill = color;
    return graphic;
  }

  stroke(color: string): Graphic {
    let graphic = new With([this]);
    graphic._stroke = color;
    return graphic;
  }

  translate(dx: number, dy: number): Graphic {
    return new Translate(this, dx, dy);
  }
  scale(sx: number, sy?: number): Graphic {
    return new Scale(this, sx, sy ?? sx);
  }
  rotate(degrees: number): Graphic {
    return new Rotate(this, degrees);
  }

  onFront(other: Graphic): Graphic {
    return new With([this, other]);
  }
  onRight(other: Graphic, margin = 0): Graphic {
    // we ignore the x component of other's origin, save y component for alignment
    return new With([this, other.translate(-other.xl + this.xr + margin, 0)]);
  }
  onLeft(other: Graphic, margin = 0): Graphic {
    // we ignore the x component of other's origin, save y component for alignment
    return new With([this, other.translate(-other.xr + this.xl - margin, 0)]);
  }
  onBottom(other: Graphic, margin = 0): Graphic {
    // we ignore the y component of other's origin, save x component for alignment
    return new With([this, other.translate(0, -other.yt + this.yb + margin)]);
  }
  onTop(other: Graphic, margin = 0): Graphic {
    // we ignore the y component of other's origin, save x component for alignment
    return new With([this, other.translate(0, -other.yb + this.yt - margin)]);
  }

  centerH(): Graphic {
    return this.translate(-this.xl - this.width() / 2, 0);
  }
  centerV(): Graphic {
    return this.translate(0, -this.yt - this.height() / 2);
  }

  _extendContext(context: GraphicContext): GraphicContext {
    // incoming context takes priority
    return {
      ...this._fill && {fill: this._fill},
      ...this._stroke && {stroke: this._stroke},
      ...context
    };
  }

  static stackH(...graphicTrees: Tree<Graphic>[]): Graphic {
    const graphics = flattenTree(graphicTrees);
    return graphics.reduce((acc, g) => acc.onRight(g));
  }

  static stackV(...graphicTrees: Tree<Graphic>[]): Graphic {
    const graphics = flattenTree(graphicTrees);
    return graphics.reduce((acc, g) => acc.onBottom(g));
  }
}

type Tree<T> = T | Tree<T>[];
function flattenTree<T>(tree: Tree<T>): T[] {
  if (Array.isArray(tree)) {
    return tree.flatMap(flattenTree);
  } else {
    return [tree];
  }
}

type GraphicContext = {
  fill?: string,
  stroke?: string,
}

export class With extends Graphic {
  xl: number;
  xr: number;
  yt: number;
  yb: number;
  constructor(private graphics: Graphic[]) {
    super();
    this.xl = Math.min(...graphics.map(g => g.xl));
    this.xr = Math.max(...graphics.map(g => g.xr));
    this.yt = Math.min(...graphics.map(g => g.yt));
    this.yb = Math.max(...graphics.map(g => g.yb));
  }
  render(context: GraphicContext) {
    const newContext = this._extendContext(context);
    return <>{this.graphics.map(g => g.render(newContext))}</>;
  }
}

export class Translate extends Graphic {
  xl: number;
  xr: number;
  yt: number;
  yb: number;
  constructor(private graphic: Graphic, private dx: number, private dy: number) {
    super();
    this.xl = graphic.xl + dx;
    this.xr = graphic.xr + dx;
    this.yt = graphic.yt + dy;
    this.yb = graphic.yb + dy;
  }
  render(context: GraphicContext) {
    const newContext = this._extendContext(context);
    return <g transform={`translate(${this.dx},${this.dy})`}>{this.graphic.render(newContext)}</g>;
  }
}

export class Scale extends Graphic {
  xl: number;
  xr: number;
  yt: number;
  yb: number;
  constructor(private graphic: Graphic, private sx: number, private sy: number) {
    super();
    this.xl = graphic.xl * sx;
    this.xr = graphic.xr * sx;
    if (this.xl > this.xr) {
      [this.xl, this.xr] = [this.xr, this.xl];
    }
    this.yt = graphic.yt * sy;
    this.yb = graphic.yb * sy;
    if (this.yt > this.yb) {
      [this.yt, this.yb] = [this.yb, this.yt];
    }
  }
  render(context: GraphicContext) {
    const newContext = this._extendContext(context);
    return <g transform={`scale(${this.sx},${this.sy})`}>{this.graphic.render(newContext)}</g>;
  }
}

export class Rotate extends Graphic {
  xl: number;
  xr: number;
  yt: number;
  yb: number;
  constructor(private graphic: Graphic, private degrees: number) {
    super();
    // TODO: BS bounding box
    this.xl = graphic.xl;
    this.xr = graphic.xr;
    this.yt = graphic.yt;
    this.yb = graphic.yb;
  }
  render(context: GraphicContext) {
    const newContext = this._extendContext(context);
    return <g transform={`rotate(${this.degrees})`}>{this.graphic.render(newContext)}</g>;
  }
}

export class Rectangle extends Graphic {
  xl = -1;
  xr = 1;
  yt = -1;
  yb = 1;
  render(context: GraphicContext) {
    const newContext = this._extendContext(context);
    return <rect
      x={-1} y={-1} width={2} height={2}
      fill={newContext.fill || 'black'} stroke={newContext.stroke || 'none'} />
  }
}
export function rectangle() { return new Rectangle(); }

export class Circle extends Graphic {
  xl = -1;
  xr = 1;
  yt = -1;
  yb = 1;
  render(context: GraphicContext) {
    const newContext = this._extendContext(context);
    return <circle
      cx={0} cy={0} r={1}
      fill={newContext.fill || 'black'} stroke={newContext.stroke || 'none'} />
  }
}
export function circle() { return new Circle(); }

export class Text extends Graphic {
  xl: number;
  xr: number;
  yt: number;
  yb: number;
  font: string = '16px sans-serif';
  metrics: TextMetrics;
  constructor(private text: string) {
    super();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    ctx.font = this.font;
    this.metrics = ctx.measureText(text);
    const width = this.metrics.width;
    const height = this.metrics.actualBoundingBoxAscent + this.metrics.actualBoundingBoxDescent;
    this.xl = -width / 2;
    this.xr = width / 2;
    this.yt = -height / 2;
    this.yb = height / 2;
  }
  render(context: GraphicContext) {
    const newContext = this._extendContext(context);
    return <text
      x={0} y={this.yb} textAnchor="middle" style={{font: this.font}}
      fill={newContext.fill || 'black'} stroke={newContext.stroke || 'none'}
    >
      {this.text}
    </text>
  }
}
export function text(...args: ConstructorParameters<typeof Text>) { return new Text(...args); }

type DisplayGraphicProps = {
  graphic: Graphic,
  width?: number,
  height?: number,
}

export const DisplayGraphic = memo(function DisplayGraphic(props: DisplayGraphicProps) {
  const { graphic, width = 200, height = 200 } = props;

  const [debugMode, setDebugMode] = useState(false);

  const margin = 5;

  // construct a matrix that takes the graphic's bounding box to the SVG's bounding box
  const xScale = (width - 2 * margin) / graphic.widthWithOrigin();
  const yScale = (height - 2 * margin) / graphic.heightWithOrigin();
  const scale = Math.min(xScale, yScale);
  const dx = -graphic.xlWithOrigin() * scale + margin;
  const dy = -graphic.ytWithOrigin() * scale + margin;
  const matrix = new Matrix(scale, 0, 0, scale, dx, dy);

  // corners of graphic's bounding box in SVG coordinates
  const tl = matrix.fromLocal([graphic.xl, graphic.yt]);
  const br = matrix.fromLocal([graphic.xr, graphic.yb]);

  // origin in SVG coordinates
  const origin = matrix.fromLocal([0, 0]);

  return (
    <svg
      onClick={() => setDebugMode(!debugMode)}
      width={width} height={height}
    >
      <g transform={matrix.cssTransform()}>
        { graphic.render({}) }
      </g>
      { debugMode && <>
        <rect x={tl[0]} y={tl[1]} width={br[0] - tl[0]} height={br[1] - tl[1]} fill="none" stroke="black" strokeWidth={2} />
        <line x1={origin[0] - 5} y1={origin[1] - 5} x2={origin[0] + 5} y2={origin[1] + 5} stroke="black" strokeWidth={2} />
        <line x1={origin[0] - 5} y1={origin[1] + 5} x2={origin[0] + 5} y2={origin[1] - 5} stroke="black" strokeWidth={2} />

        <rect x={tl[0]} y={tl[1]} width={br[0] - tl[0]} height={br[1] - tl[1]} fill="none" stroke="white" strokeWidth={1} />
        <line x1={origin[0] - 5} y1={origin[1] - 5} x2={origin[0] + 5} y2={origin[1] + 5} stroke="white" strokeWidth={1} />
        <line x1={origin[0] - 5} y1={origin[1] + 5} x2={origin[0] + 5} y2={origin[1] - 5} stroke="white" strokeWidth={1} />
      </> }
    </svg>
  );
})

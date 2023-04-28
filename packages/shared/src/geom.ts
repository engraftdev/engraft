// Adapted from Apparatus

export type Point = [number, number];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export let Point = {
  quadrance([x1, y1]: Point, [x2, y2]: Point) {
    let dx = x2 - x1, dy = y2 - y1;
    return dx * dx + dy * dy;
  },

  dist(p1: Point, p2: Point) {
    return Math.sqrt(Point.quadrance(p1, p2));
  },

  len(p: Point) {
    return Point.dist(p, [0, 0]);
  },

  add([x1, y1]: Point, [x2, y2]: Point): Point {
    return [x1 + x2, y1 + y2];
  },

  sub([x1, y1]: Point, [x2, y2]: Point): Point {
    return [x1 - x2, y1 - y2];
  },

  mul([x, y]: Point, t: number): Point {
    return [x * t, y * t];
  },

  polar(r: number, th: number): Point {
    return [r * Math.cos(th), r * Math.sin(th)];
  },

  angle([x, y]: Point): number {
    return Math.atan2(y, x);
  },

  lerp(p1: Point, p2: Point, t: number) {
    return Point.add(Point.mul(p1, 1 - t), Point.mul(p2, t));
  }
}

export function rectTopLeftPt(rect: DOMRect): Point {
  return [rect.left, rect.top];
}

export function clientPt(ev: MouseEvent): Point {
  return [ev.clientX, ev.clientY];
}

export function clientPtRel(ev: MouseEvent): Point {
  return Point.sub(clientPt(ev), rectTopLeftPt((ev.currentTarget as HTMLElement).getBoundingClientRect()));
}


// This is one of these: https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix

// The most common matrix we use is a "view matrix". This maps semantic
// coordinates to screen coordinates. In this context, "local" means "semantic".

export class Matrix {
  readonly a: number
  readonly b: number
  readonly c: number
  readonly d: number
  readonly e: number
  readonly f: number
  _inverse: Matrix | undefined

  constructor (a=1, b=0, c=0, d=1, e=0, f=0) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
  }

  static translate (x: number, y: number): Matrix {
    return new Matrix(1, 0, 0, 1, x, y);
  }
  translate (x: number, y: number): Matrix {
    return this.compose(Matrix.translate(x, y));
  }

  static scale (x: number, y: number = x): Matrix {
    return new Matrix(x, 0, 0, y, 0, 0);
  }
  scale (x: number, y: number = x): Matrix {
    return this.compose(Matrix.scale(x, y));
  }

  static rotate (angle: number): Matrix {
    let c = Math.cos(angle);
    let s = Math.sin(angle);
    return new Matrix(c, s, -s, c, 0, 0);
  }
  rotate (angle: number): Matrix {
    return this.compose(Matrix.rotate(angle));
  }

  // this is "conjugation"
  atPoint (x: number, y: number): Matrix;
  atPoint (pt: Point): Matrix;
  atPoint (p1: number | Point, p2?: number) {
    if (typeof p1 === 'number') {
      const x = p1, y = p2 as number;
      return Matrix.seq(Matrix.translate(-x, -y), this, Matrix.translate(x, y));
    } else {
      const pt = p1;
      return this.atPoint(pt[0], pt[1])
    }
  }

  transform (a: number, b: number, c: number, d: number, e: number, f: number): Matrix {
    return new Matrix(
      this.a * a + this.c * b,
      this.b * a + this.d * b,
      this.a * c + this.c * d,
      this.b * c + this.d * d,
      this.a * e + this.c * f + this.e,
      this.b * e + this.d * f + this.f,
    );
  }

  compose (m: Matrix): Matrix {
    return this.transform(m.a, m.b, m.c, m.d, m.e, m.f);
  }

  inverse (): Matrix {
    if (this._inverse) { return this._inverse; }
    let ad_minus_bc = this.a * this.d - this.b * this.c;
    let bc_minus_ad = this.b * this.c - this.a * this.d;
    this._inverse = new Matrix(
      this.d / ad_minus_bc,
      this.b / bc_minus_ad,
      this.c / bc_minus_ad,
      this.a / ad_minus_bc,
      (this.d * this.e - this.c * this.f) / bc_minus_ad,
      (this.b * this.e - this.a * this.f) / ad_minus_bc
    );
    return this._inverse;
  }

  fromLocal ([x, y]: Point): Point {
    return [
      this.a * x + this.c * y + this.e,
      this.b * x + this.d * y + this.f,
    ];
  }

  toLocal (pt: Point): Point {
    return this.inverse().fromLocal(pt);
  }

  origin (): Point {
    return [this.e, this.f];
  }

  canvasSetTransform (ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(this.a, this.b, this.c, this.d, this.e, this.f)
  }

  canvasTransform (ctx: CanvasRenderingContext2D): void {
    ctx.transform(this.a, this.b, this.c, this.d, this.e, this.f)
  }

  cssTransform(): string {
    return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`
  }

  static naturalConstruct (x: number, y: number, sx: number, sy: number, rotate: number): Matrix {
    let c = Math.cos(rotate);
    let s = Math.sin(rotate);
    return new Matrix(
      c * sx,
      s * sx,
      -s * sy,
      c * sy,
      x,
      y,
    );
  }

  // Opposite order of normal matrix multiplication
  static seq(...mats: Matrix[]): Matrix {
    let ret = new Matrix();
    for (let i = mats.length - 1; i >= 0; i--) {
      ret = ret.compose(mats[i]);
    }
    return ret;
  }
}

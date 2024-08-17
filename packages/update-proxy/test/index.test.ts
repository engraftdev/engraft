import { Updater } from "@engraft/shared/lib/Updater.js";
import { describe, expect, it } from "vitest";
import { up, updateProxy } from "../lib/index.js";

describe('updateProxy', () => {
  it('works directly', () => {
    let x = 0;
    let updateX: Updater<typeof x> = (f) => x = f(x);
    let xUP = updateProxy(updateX);

    expect(x).toBe(0);
    xUP.$apply(x => x + 1);
    expect(x).toBe(1);
    xUP.$set(100);
    expect(x).toBe(100);
  });

  it('works in an object', () => {
    let c = {};
    let x = {a: 0, b: 0, c};
    let updateX: Updater<typeof x> = (f) => x = f(x);
    let xUP = updateProxy(updateX);

    expect(x).toEqual({a: 0, b: 0, c: {}});
    xUP.a.$apply(a => a + 1);
    expect(x).toEqual({a: 1, b: 0, c: {}});
    expect(x.c).toBe(c);  // make sure c maintains reference equality
  });

  it('works in an array', () => {
    let x = [0, 0, 0];
    let updateX: Updater<typeof x> = (f) => x = f(x);
    let xUP = updateProxy(updateX);

    expect(x).toEqual([0, 0, 0]);
    xUP[1].$apply(a => a + 1);
    expect(x).toEqual([0, 1, 0]);
    xUP[2].$apply(a => a + 2);
    expect(x).toEqual([0, 1, 2]);
  });

  it('preserves reference equality when possible in an array', () => {
    let x = [{n: 0}, {n: 0}, {n: 0}];
    let x2 = x[2];
    let updateX: Updater<typeof x> = (f) => x = f(x);
    let xUP = updateProxy(updateX);

    expect(x).toEqual([{n: 0}, {n: 0}, {n: 0}]);
    xUP[1].n.$apply(n => n + 1);
    expect(x).toEqual([{n: 0}, {n: 1}, {n: 0}]);
    expect(x[2]).toBe(x2);  // make sure x2 maintains reference equality
  });

  it('is safely typed on objects', () => {
    let x = {a: 0, b: 0};
    let updateX: Updater<typeof x> = (f) => x = f(x);
    let xUP = updateProxy(updateX);

    // @ts-expect-error
    xUP.a.$apply(a => a + "hello");

    // @ts-expect-error
    xUP.c.$apply(c => c + 1);

    // @ts-expect-error
    xUP[0].$apply(c => c + 1);
  });

  it('is safely typed on arrays', () => {
    let x: number[] = [0, 0];
    let updateX: Updater<typeof x> = (f) => x = f(x);
    let xUP = updateProxy(updateX);

    if (false) {
      // @ts-expect-error
      xUP[0].$apply(a => a + "hello");

      // @ts-expect-error
      xUP.c.$apply(c => c + 1);

      // @ts-expect-error
      void(xUP.map);
    }
  });

  it('memoizes proxies (& functions thereof) from properties', () => {
    let x = {a: 0, b: {c: 0}};
    let updateX: Updater<typeof x> = (f) => x = f(x);
    let xUP = updateProxy(updateX);

    expect(xUP.a).toBe(xUP.a);
    expect(xUP.a.$set).toBe(xUP.a.$set);
    expect(xUP.a.$apply).toBe(xUP.a.$apply);
    expect(xUP.b.c).toBe(xUP.b.c);
  });

  it('can remove from array', () => {
    let x = [0, 1, 2];
    let updateX: Updater<typeof x> = (f) => x = f(x);
    let xUP = updateProxy(updateX);

    expect(x).toEqual([0, 1, 2]);
    xUP[1].$remove();
    expect(x).toEqual([0, 2]);
  });

  it('can remove from object if property is inessential', () => {
    let x: {[k: string]: number} = {a: 0, b: 1, c: 2};
    let updateX: Updater<typeof x> = (f) => x = f(x);
    let xUP = updateProxy(updateX);

    expect(x).toEqual({a: 0, b: 1, c: 2});
    xUP.b.$remove();
    expect(x).toEqual({a: 0, c: 2});
  });

  it('only allows `$remove` when it is well-typed', () => {
    if (false) {
      // @ts-expect-error removing at base
      updateProxy(undefined as unknown as Updater<{a: number}>).$remove();

      // @ts-expect-error removing essential property
      updateProxy(undefined as unknown as Updater<{a: number}>).a.$remove();
    }
  });

  it('preserves reference equality when possible in an array', () => {
    let x = [{n: 0}, {n: 1}, {n: 2}];
    let x2 = x[2];
    let updateX: Updater<typeof x> = (f) => x = f(x);
    let xUP = updateProxy(updateX);

    expect(x).toEqual([{n: 0}, {n: 1}, {n: 2}]);
    xUP[1].$remove();
    expect(x).toEqual([{n: 0}, {n: 2}]);
    expect(x[1]).toBe(x2);  // make sure x2 maintains reference equality
  });

  it('memoizes $remove', () => {
    let x = [0, 1, 2];
    let updateX: Updater<typeof x> = (f) => x = f(x);
    let xUP = updateProxy(updateX);

    expect(xUP[1].$remove).toBe(xUP[1].$remove);
  });

  it('works with $all on arrays', () => {
    let x = [0, 1, 2];
    let updateX: Updater<typeof x> = (f) => x = f(x);
    let xUP = updateProxy(updateX);

    expect(x).toEqual([0, 1, 2]);
    xUP.$all.$apply(a => a + 1);
    expect(x).toEqual([1, 2, 3]);
  });

  it('works with $all.prop on arrays', () => {
    let x = [{a: 0}, {a: 1}, {a: 2}];
    let updateX: Updater<typeof x> = (f) => x = f(x);
    let xUP = updateProxy(updateX);

    expect(x).toEqual([{a: 0}, {a: 1}, {a: 2}]);
    xUP.$all.a.$apply(a => a + 1);
    expect(x).toEqual([{a: 1}, {a: 2}, {a: 3}]);
  });

  it('works with $all.$all on arrays of arrays', () => {
    let x = [[0, 1], [2, 3, 4], [5, 6, 7, 8]];
    let updateX: Updater<typeof x> = (f) => x = f(x);
    let xUP = updateProxy(updateX);

    xUP.$all.$all.$apply(a => a + 1);
    expect(x).toEqual([[1, 2], [3, 4, 5], [6, 7, 8, 9]]);
  });

  it('works with $all on objects', () => {
    let x = {a: 0, b: 1, c: 2};
    let updateX: Updater<typeof x> = (f) => x = f(x);
    let xUP = updateProxy(updateX);

    expect(x).toEqual({a: 0, b: 1, c: 2});
    xUP.$all.$apply(a => a + 1);
    expect(x).toEqual({a: 1, b: 2, c: 3});
  });

  it('works with optional properties', () => {
    let x: {a: number, b?: number} = {a: 0};
    let updateX: Updater<typeof x> = (f) => x = f(x);
    let xUP = updateProxy(updateX);

    xUP.b.$apply(b => (b || 0) + 1);
    expect(x).toEqual({a: 0, b: 1});
    xUP.b.$apply(b => (b || 0) + 1);
    expect(x).toEqual({a: 0, b: 2});

    if (false) {
      // @ts-expect-error trying to ignore that `b` may be `undefined`.
      xUP.b.$apply(b => b + 1);
    }
  });
});

describe.todo('updateWithUP');

describe('up', () => {
  it('basically works', () => {
    const updater1 = () => {};
    const updateProxy1a = up(updater1);
    const updateProxy1b = up(updater1);
    expect(updateProxy1a).toBe(updateProxy1b);

    const updater2 = () => {};
    const updateProxy2 = up(updater2);
    expect(updateProxy2).not.toBe(updateProxy1a);
  });
});

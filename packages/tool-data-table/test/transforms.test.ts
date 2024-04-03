import { describe, expect, it } from 'vitest';
import { inferDataFrameFromRows } from '../lib/data-frame.js';
import { applyTransforms } from '../lib/transforms.js';

describe('applyTransforms', () => {
  it('zero or one sorts work', () => {
    const rows = [{numberAsc: 1, numberDesc: 4, stringAsc: "xxx"}, {numberAsc: 3, numberDesc: 2, stringAsc: "yyy"}];
    const rowsFlipped = [rows[1], rows[0]];
    const data = inferDataFrameFromRows(rows);
    expect(applyTransforms(data, { sort: [] }).rows)
      .toEqual(rows);
    expect(applyTransforms(data, { sort: [ { column: 'numberAsc', direction: 'asc' } ] }).rows)
      .toEqual(rows);
    expect(applyTransforms(data, { sort: [ { column: 'numberAsc', direction: 'desc' } ] }).rows)
      .toEqual(rowsFlipped);
    expect(applyTransforms(data, { sort: [ { column: 'numberDesc', direction: 'asc' } ] }).rows)
      .toEqual(rowsFlipped);
    expect(applyTransforms(data, { sort: [ { column: 'numberDesc', direction: 'desc' } ] }).rows)
      .toEqual(rows);
    expect(applyTransforms(data, { sort: [ { column: 'stringAsc', direction: 'asc' } ] }).rows)
      .toEqual(rows);
    expect(applyTransforms(data, { sort: [ { column: 'stringAsc', direction: 'desc' } ] }).rows)
      .toEqual(rowsFlipped);
  });

  it('two sorts work', () => {
    const someNumbers = [ 3, 1, 2 ];
    const rows = someNumbers.flatMap((n1) => someNumbers.map((n2) => ({n1, n2})));
    const data = inferDataFrameFromRows(rows);
    expect(applyTransforms(data, { sort: [ { column: 'n1', direction: 'asc' }, { column: 'n2', direction: 'asc' } ] }).rows)
      .toEqual([
        {n1: 1, n2: 1},
        {n1: 1, n2: 2},
        {n1: 1, n2: 3},
        {n1: 2, n2: 1},
        {n1: 2, n2: 2},
        {n1: 2, n2: 3},
        {n1: 3, n2: 1},
        {n1: 3, n2: 2},
        {n1: 3, n2: 3},
      ]);
    expect(applyTransforms(data, { sort: [ { column: 'n2', direction: 'asc' }, { column: 'n1', direction: 'asc' } ] }).rows)
      .toEqual([
        {n1: 1, n2: 1},
        {n1: 2, n2: 1},
        {n1: 3, n2: 1},
        {n1: 1, n2: 2},
        {n1: 2, n2: 2},
        {n1: 3, n2: 2},
        {n1: 1, n2: 3},
        {n1: 2, n2: 3},
        {n1: 3, n2: 3},
      ]);
  });

  it('slice works', () => {
    const rows = [{x: 1}, {x: 2}, {x: 3}, {x: 4}, {x: 5}];
    const data = inferDataFrameFromRows(rows);
    expect(applyTransforms(data, { slice: { from: 1, to: 3 } }).rows)
      .toEqual([{x: 2}, {x: 3}]);
    expect(applyTransforms(data, { slice: { from: null, to: 3 } }).rows)
      .toEqual([{x: 1}, {x: 2}, {x: 3}]);
    expect(applyTransforms(data, { slice: { from: 1, to: null } }).rows)
      .toEqual([{x: 2}, {x: 3}, {x: 4}, {x: 5}]);
  });

  it.todo('filter works');

  it('select works', () => {
    const rows = [{x: 1, y: 2}, {x: 3, y: 4}];
    const data = inferDataFrameFromRows(rows);
    expect(applyTransforms(data, { select: null }).rows)
      .toEqual(rows);
    expect(applyTransforms(data, { select: ['x'] }).rows)
      .toEqual([{x: 1}, {x: 3}]);
    expect(applyTransforms(data, { select: ['y'] }).rows)
      .toEqual([{y: 2}, {y: 4}]);
    expect(applyTransforms(data, { select: ['x', 'y'] }).rows)
      .toEqual(rows);
    expect(applyTransforms(data, { select: ['y', 'x'] }).columns)
      .toEqual([{name: 'y', type: 'integer'}, {name: 'x', type: 'integer'}])
    expect(applyTransforms(data, { select: ['y', 'x'] }).rows)
      .toEqual(rows);
  });

  it('names works', () => {
    const rows = [{x: 1, y: 2}, {x: 3, y: 4}];
    const data = inferDataFrameFromRows(rows);
    expect(applyTransforms(data, { names: [ { column: 'x', name: 'xNew' } ] }).rows)
      .toEqual([{xNew: 1, y: 2}, {xNew: 3, y: 4}]);
  });
});

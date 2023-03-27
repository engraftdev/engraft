import { assert, assertNever } from "@engraft/shared/lib/assert.js";
import { DataFrame, Row, ValueType } from "./data-frame.js";

export type Transforms = {
  sort: Sort[],
  slice?: Slice,
  filter: Filter[],
  select?: string[] | null,  // different from Observable; no `columns` property
  names: Name[],
}
export type Sort = { column: string, direction: 'asc' | 'desc' }
export type Slice = { from: number | null, to: number | null }
export type Filter = { type: FilterType, operands: Operand[] }
export const filterTypes = {
  eq: { label: '=', arity: 2 },  // TODO: 'is' for strings
  ne: { label: '!=', arity: 2 },  // TODO: 'is not' for strings
  lt: { label: '<', arity: 2 },
  lte: { label: '<=', arity: 2 },
  gt: { label: '>', arity: 2 },
  gte: { label: '>=', arity: 2 },
  in: { label: 'is in', arity: 2 },
  nin: { label: 'is not in', arity: 2 },
  n: { label: 'is null', arity: 1 },
  nn: { label: 'is not null', arity: 1 },
  c: { label: 'contains', arity: 2 },
  nc: { label: 'does not contain', arity: 2 },
}
export type FilterType = keyof typeof filterTypes;
export const filterTypesByValueType: Record<ValueType, FilterType[]> = {
  integer: ['eq', 'ne', 'lt', 'gt', 'lte', 'gte', 'in', 'nin', 'n', 'nn'],
  number: ['eq', 'ne', 'lt', 'gt', 'lte', 'gte', 'in', 'nin', 'n', 'nn'],
  string: ['eq', 'ne', 'c', 'nc', 'lt', 'gt', 'lte', 'gte', 'in', 'nin', 'n', 'nn'],
  boolean: ['eq', 'ne', 'n', 'nn'],
  date: ['eq', 'ne', 'lt', 'gt', 'lte', 'gte', 'in', 'nin', 'n', 'nn'],
  other: [],  // TODO
}
export type Operand = { type: 'column', value: string } | { type: 'resolved', value: unknown }
export type Name = { column: string, name: string }

export function applyTransforms(dataFrame: DataFrame, transforms: Transforms) {
  let result = dataFrame
  if (transforms.sort) {
    // apply sorts in reverse order so first sort is most significant
    for (const sort of transforms.sort.slice().reverse()) {
      result = applySort(result, sort)
    }
  }
  if (transforms.slice) {
    // TODO: I'm slicing after sorting. Observable does it in the other order. These don't commute.
    result = applySlice(result, transforms.slice)
  }
  if (transforms.filter) {
    for (const filter of transforms.filter) {
      result = applyFilter(result, filter)
    }
  }
  if (transforms.select) {
    result = applySelect(result, transforms.select)
  }
  if (transforms.names) {
    // TODO: applying names one by one doesn't work with weird overlapping column names (like a swap)
    for (const name of transforms.names) {
      result = applyName(result, name)
    }
  }
  return result;
}

function applySort(dataFrame: DataFrame, sort: Sort): DataFrame {
  const { rows } = dataFrame
  const column = sort.column;
  const direction = sort.direction;
  const rowsSorted = [...rows];
  rowsSorted.sort((a, b) => {
    const aValue = (a as any)[column];
    const bValue = (b as any)[column];
    if (aValue === bValue) {
      return 0;
    }
    if (aValue === null || aValue === undefined) {
      return direction === 'asc' ? -1 : 1;
    }
    if (bValue === null || bValue === undefined) {
      return direction === 'asc' ? 1 : -1;
    }
    if (aValue < bValue) {
      return direction === 'asc' ? -1 : 1;
    }
    return direction === 'asc' ? 1 : -1;
  });
  return {
    ...dataFrame,
    rows: rowsSorted,
  };
}

function applySlice(dataFrame: DataFrame, slice: Slice): DataFrame {
  const { rows } = dataFrame
  const from = slice.from ?? 0
  const to = slice.to ?? rows.length
  return {
    ...dataFrame,
    rows: rows.slice(from, to),
  };
}

function applyFilter(dataFrame: DataFrame, filter: Filter): DataFrame {
  const { rows } = dataFrame;
  const type = filter.type;
  const operands = filter.operands;
  const rowsFiltered = rows.filter(row => {
    // TODO: this try/catch & the JSON within is a lazy stopgap
    try {
      const values = operands.map(operand => {
        if (operand.type === 'column') {
          return (row as any)[operand.value];
        }
        // return operand.value;
        return JSON.parse(operand.value as string);
      })
      return checkFilter(type, values);
    } catch {
      return true;
    }
  })
  return {
    ...dataFrame,
    rows: rowsFiltered,
  };
}

function checkFilter(type: FilterType, values: unknown[]) {
  switch (type) {
    case 'eq':
      // TODO: format as = or 'is'
      return values[0] === values[1]
    case 'ne':
      // todo: format as ≠ or 'is not'
      return values[0] !== values[1]
    case 'lt':
      assert(typeof values[0] === 'number' && typeof values[1] === 'number');
      return values[0] < values[1]
    case 'lte':
      assert(typeof values[0] === 'number' && typeof values[1] === 'number');
      return values[0] <= values[1]
    case 'gt':
      assert(typeof values[0] === 'number' && typeof values[1] === 'number');
      return values[0] > values[1]
    case 'gte':
      assert(typeof values[0] === 'number' && typeof values[1] === 'number');
      return values[0] >= values[1]
    case 'in': {
      const [first, ...rest] = values;
      return rest.includes(first);
    }
    case 'nin': {
      const [first, ...rest] = values;
      return !rest.includes(first);
    }
    case 'n':
      // TODO: handle NaN?
      return values[0] === null || values[0] === undefined
    case 'nn':
      // TODO: handle NaN?
      return values[0] !== null && values[0] !== undefined
    // case 'v':
    //   // todo: valid member of column type?
    // case 'nv':
    //   // todo: not valid member of column type?
    case 'c':
      assert(typeof values[0] === 'string' && typeof values[1] === 'string');
      return values[0].includes(values[1])
    case 'nc':
      assert(typeof values[0] === 'string' && typeof values[1] === 'string');
      return !values[0].includes(values[1])
    default:
      assertNever(type);
  }
}

function applySelect(dataFrame: DataFrame, select: string[] | null): DataFrame {
  if (!select) {
    return dataFrame
  }
  const { columns, rows } = dataFrame;
  const selectedColumns = select.flatMap((columnName) => {
    const column = columns.find((column) => column.name === columnName);
    return column ? [column] : [];
  });
  const rowsSelected = rows.map(row => {
    const newRow: any = {};
    for (const column of select) {
      newRow[column] = (row as any)[column];
    }
    return newRow;
  });
  return {
    ...dataFrame,
    columns: selectedColumns,
    rows: rowsSelected,
  };
}

function applyName(dataFrame: DataFrame, nameTransform: Name): DataFrame {
  const { columns, rows } = dataFrame;
  const columnsNamed = columns.map(column => {
    if (column.name === nameTransform.column) {
      return {
        ...column,
        name: nameTransform.name,
      }
    }
    return column;
  });
  const rowsNamed = rows.map(row => {
    const newRow: Row = { ...row }
    newRow[nameTransform.name] = row[nameTransform.column];
    delete newRow[nameTransform.column];
    return newRow
  })
  return {
    ...dataFrame,
    columns: columnsNamed,
    rows: rowsNamed,
  }
}

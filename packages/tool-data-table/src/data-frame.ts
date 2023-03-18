import { isObject } from "@engraft/shared/lib/isObject.js";
import { isArray } from "@engraft/shared/lib/isArray.js";

export type DataFrame = {
  columns: Column[],
  rows: Row[],
}

export type Column = {name: string, type: ValueType};
export type ValueType = 'integer' | 'number' | 'string' | 'boolean' | 'date' | 'other';

export type Row = Record<string, unknown>;

type ValueTypeExtended = ValueType | 'unknown';

// given a value, produce the most specific value type that includes the value
function inferTypeFromValue(value: unknown): ValueTypeExtended {
  if (value === null || value === undefined) {
    return 'unknown';
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return 'integer';
    }
    return 'number';
  }
  if (typeof value === 'string') {
    // TODO: date stuff
    // if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    //     return 'date';
    // }
    return 'string';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (value instanceof Date) {
    return 'date';
  }
  return 'other';
}

// given two value types, produce the most specific value type that includes both
function joinTypes(type1: ValueTypeExtended, type2: ValueTypeExtended): ValueTypeExtended {
  if (type1 === type2) {
    return type1;
  }
  if ((type1 === 'integer' && type2 === 'number') ||
      (type1 === 'number' && type2 === 'integer')) {
    return 'number';
  }
  if (type1 === 'unknown') {
    return type2;
  }
  if (type2 === 'unknown') {
    return type1;
  }
  return 'other';
}

// given an array of value types, produce the most specific value type that includes all of them (or 'other' if there are no values)
export function inferTypeFromValues(values: unknown[]): ValueType {
  const merged = values.reduce<ValueTypeExtended>((type, value) => joinTypes(type, inferTypeFromValue(value)), 'unknown');
  return merged === 'unknown' ? 'other' : merged;
}

export function inferDataFrameFromRows(rows: unknown): DataFrame {
  if (!isArray(rows)) {
    throw new Error('`rows` must be an array');
  }
  if (!rows.length) {
    return {
      columns: [],
      rows: [],
    }
  }

  // Sort values into columns
  const byColumn: Record<string, unknown[]> = {};
  for (const row of rows) {
    if (!isObject(row)) {
      throw new Error('`rows` must be an array of objects');
    }
    for (const [key, value] of Object.entries(row)) {
      if (!byColumn[key]) {
        byColumn[key] = [];
      }
      byColumn[key].push(value);
    }
  }

  const columns = Object.entries(byColumn).map(([name, values]) => ({
    name,
    type: inferTypeFromValues(values),
  }));

  return {
    columns,
    rows: rows as Row[],  // validated in the byColumn loop
  };
}

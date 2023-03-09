import { randomId } from '@engraft/core';
import seedrandom from 'seedrandom';

export function hashId(...args: any[]): string {
  return randomId(seedrandom(JSON.stringify(args)));
}

// TODO: extended this from a-z so I could shove js variable names in; not great
export const idRegExp = "ID[a-zA-Z_]*[0-9]{6}";

// This is independent: a li'l system to generate runtime ids for arbitrary objects (for debugging)

export function runtimeObjectId(obj: any): string {
  const fromMap = runtimeObjectIdMap.get(obj);
  if (fromMap !== undefined) {
    return fromMap;
  }

  const id = randomId();
  runtimeObjectIdMap.set(obj, id);
  return id;
}

const runtimeObjectIdMap = new WeakMap<any, string>();

// This is also independent: functional getters and updaters by id for nested objects
// TODO: hacky

export function findNested(obj: unknown, pred: (obj: unknown) => boolean | void): unknown {
  if (pred(obj)) {
    return obj;
  }
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const result = findNested((obj as any)[key], pred);
        if (result !== undefined) {
          return result;
        }
      }
    }
  }
  return undefined;
}

export function findAllNested(obj: unknown, pred: (obj: unknown) => boolean | void): unknown[] {
  const result = [];
  if (pred(obj)) {
    result.push(obj);
  }
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result.push(...findAllNested((obj as any)[key], pred));
      }
    }
  }
  return result;
}

export function getById(obj: unknown, id: string): any {
  return findNested(obj, (obj) => {
    if (obj && typeof obj === 'object') {
      return (obj as any).id === id;
    }
  });

  // if (Array.isArray(obj)) {
  //   for (const item of obj) {
  //     const result = getById(item, id);
  //     if (result !== undefined) {
  //       return result;
  //     }
  //   }
  // } else if (obj && typeof obj === 'object') {
  //   if (obj.id === id) {
  //     return obj;
  //   }
  //   for (const item of Object.values(obj)) {
  //     const result = getById(item, id);
  //     if (result !== undefined) {
  //       return result;
  //     }
  //   }
  // }
  // return undefined;
}

export function updateById<T>(obj: any, id: string, updater: (old: T) => T): any {
  if (Array.isArray(obj)) {
    return obj.map(item => updateById(item, id, updater));
  } else if (obj && typeof obj === 'object') {
    if (obj.id === id) {
      return updater(obj);
    }
    const newObj = { ...obj };
    for (const key of Object.keys(obj)) {
      newObj[key] = updateById(obj[key], id, updater);
    }
    return newObj;
  } else {
    return obj;
  }
}

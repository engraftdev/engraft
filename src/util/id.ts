import seedrandom from 'seedrandom';
import { objects } from 'friendly-words';


export function newId(random: () => number = Math.random): string {
  return `ID${objects[Math.floor(random() * objects.length)]}${random().toFixed(6).slice(2)}`;
}

export function hashId(...args: any[]): string {
  return newId(seedrandom(JSON.stringify(args)));
}
(window as any).hashId = hashId;

// TODO: extended this from a-z so I could shove js variable names in; not great
export const idRegExp = "ID[a-zA-Z_]*[0-9]{6}";

// This is independent: a li'l system to generate runtime ids for arbitrary objects (for debugging)

export function runtimeObjectId(obj: any): string {
  const fromMap = runtimeObjectIdMap.get(obj);
  if (fromMap !== undefined) {
    return fromMap;
  }

  const id = newId();
  runtimeObjectIdMap.set(obj, id);
  return id;
}

const runtimeObjectIdMap = new WeakMap<any, string>();

// This is also independent: functional getters and updaters by id for nested objects
// TODO: hacky

export function getById(obj: any, id: string): any {
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const result = getById(item, id);
      if (result !== undefined) {
        return result;
      }
    }
  } else if (obj && typeof obj === 'object') {
    if (obj.id === id) {
      return obj;
    }
    for (const item of Object.values(obj)) {
      const result = getById(item, id);
      if (result !== undefined) {
        return result;
      }
    }
  }
  return undefined;
}

export function updateById(obj: any, id: string, updater: (old: any) => any): any {
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

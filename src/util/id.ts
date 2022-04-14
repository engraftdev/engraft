import { objects } from 'friendly-words';

export function newId(): string {
  return `ID${objects[Math.floor(Math.random() * objects.length)]}${Math.random().toFixed(6).slice(2)}`;
}

export const idRegExp = "ID[a-z]*[0-9]{6}";

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

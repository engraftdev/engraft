export function runtimeObjectId(obj: any): number {
  const fromMap = runtimeObjectIdMap.get(obj);
  if (fromMap !== undefined) {
    return fromMap;
  } else {
    const objId = nextId;
    nextId++;
    runtimeObjectIdMap.set(obj, objId);
    return objId;
  }
}

let nextId = 0;
const runtimeObjectIdMap = new WeakMap<any, number>();

export function setKeys<T, U extends T>(updates: T): (obj: U) => U  {
  return (obj: U) => ({...obj, ...updates});
}

export function setKeys2<T>(updates: Partial<T>): (obj: T) => T  {
  return (obj: T) => ({...obj, ...updates});
}
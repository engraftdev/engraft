export function mapUpdate<K, V>(map: Map<K, V>, key: K, func: (oldV: V | undefined) => V | undefined) {
  const oldV = map.get(key);
  const newV = func(oldV);
  if (newV !== undefined) {
    map.set(key, newV);
  } else if (oldV !== undefined) {
    map.delete(key);
  }
}
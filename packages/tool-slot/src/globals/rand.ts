import seedrandom from "seedrandom";

export function makeRand(): (...args: unknown[]) => number {
  const generators: { [key: string]: seedrandom.PRNG } = {};
  return (...args: any[]) => {
    const key = JSON.stringify(args);
    if (!generators[key]) {
      generators[key] = seedrandom(key);
    }
    return generators[key]();
  }
}

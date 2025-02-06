import { OrError } from "./OrError.js";

// TODO: this will just fill up... someday we should be Principled
export function cache<Return>(f: (arg: string) => Return): (arg: string) => Return {
  const _cache: {[arg: string]: OrError<Return>} = {};
  return (arg: string) => {
    let cached = _cache[arg];
    if (!cached) {
      cached = _cache[arg] = OrError.try(() => f(arg));
    }
    return OrError.orThrow(cached);
  }
}

export function weakMapCache<Arg extends object, Return>(f: (arg: Arg) => Return): (arg: Arg) => Return {
  const _cache = new WeakMap<Arg, OrError<Return>>();
  return (arg: Arg) => {
    let cached = _cache.get(arg);
    if (!cached) {
      cached = OrError.try(() => f(arg));
      _cache.set(arg, cached);
    }
    return OrError.orThrow(cached);
  }
}

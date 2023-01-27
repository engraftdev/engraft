import { hasProperty } from "./hasProperty";

type OrError<T> = {value: T} | {error: unknown};

// eslint-disable-next-line @typescript-eslint/no-redeclare
const OrError = {
  try<T>(f: () => T): OrError<T> {
    try {
      return {value: f()};
    } catch (e) {
      return {error: e};
    }
  },
  orThrow<T>(f: OrError<T>): T {
    if (hasProperty(f, 'error')) {
      throw f.error;
    } else {
      return f.value;
    }
  },
};

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

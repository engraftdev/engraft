import { hasProperty } from "./hasProperty";

export type OrError<T> = T | {error: unknown};

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const OrError = {
  catch<T>(f: () => T): OrError<T> {
    try {
      return f();
    } catch (e) {
      return {error: e};
    }
  },
  throw<T>(f: OrError<T>): T {
    if (hasProperty(f, 'error')) {
      throw f.error;
    } else {
      return f;
    }
  },
};

import { hasProperty } from "./hasProperty.js";

export type OrError<T> = {value: T} | {error: unknown};

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const OrError = {
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

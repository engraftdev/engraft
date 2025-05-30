import { useEffect, useState } from "react";

// note: this only checks local storage at initialization, not continuously.
// (that would be cool tho; see "StorageItem" in a different project.)
// it's also inefficient.
// hope u like it tho.

export function useLocalStorage<T>(
  key: string,
  init: () => T,
  parse: (s: string) => T = JSON.parse,
  stringify: (t: T) => string = JSON.stringify
) {
  const [t, setT] = useState<T>(() => {
    try {
      const str = window.localStorage.getItem(key)
      if (str) {
        return parse(str);
      }
    } catch {}
    return init();
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, stringify(t));
    } catch (e) {
      console.warn("error saving to local storage", e);
    }
  }, [key, stringify, t]);

  return [t, setT] as const;
}

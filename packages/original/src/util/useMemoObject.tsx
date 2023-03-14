import { useMemo } from "react";

export function useMemoObject<T extends object>(obj: T): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => obj, Object.values(obj));
}

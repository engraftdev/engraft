import { useMemo } from "react";
import { UpdateProxy, updateProxy } from "@engraft/update-proxy";
import { Updater } from "@engraft/shared/src/Updater";

export function useUpdateProxy<T>(updater: Updater<T>): UpdateProxy<T>;
export function useUpdateProxy<T>(updater: Updater<T> | undefined): UpdateProxy<T> | undefined;
export function useUpdateProxy<T>(updater: Updater<T> | undefined): UpdateProxy<T> | undefined {
  return useMemo(() => updater && updateProxy(updater), [updater]);
}

// no reason to `memo()` this; the `children` function will always be fresh anyway
export function UseUpdateProxy<T>(props: {
  updater: Updater<T>,
  children: (updateProxy: UpdateProxy<T>) => React.ReactElement | null,
}) {
  const updateProxy = useUpdateProxy(props.updater);
  return props.children(updateProxy);
}

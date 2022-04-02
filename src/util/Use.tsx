import { ReactElement } from "react";

export function Use<T>({hook, children}: {hook: () => T, children: (t: T) => ReactElement}) {
  const t = hook();
  return children(t);
}

export function hookToComponent<T>(hook: () => T) {
  return ({children}: {children: (t: T) => ReactElement}) =>
    <Use hook={hook}>{children}</Use>;
}
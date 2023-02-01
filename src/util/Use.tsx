import { ReactElement, useContext, useState } from "react";

export function Use<Return>(props: {hook: () => Return, children: (ret: Return) => ReactElement}): ReactElement;
export function Use<Args extends any[], Return>(props: {hook: (...args: Args) => Return, args: Args, children: (ret: Return) => ReactElement}): ReactElement;
export function Use<Args extends any[], Return>(props: {hook: (...args: Args) => Return, args?: Args, children: (ret: Return) => ReactElement}) {
  const {hook, args, children} = props;
  const ret = hook(...args || ([] as any as Args));
  return children(ret);
}

export function hookToComponent<T>(hook: () => T) {
  return ({children}: {children: (t: T) => ReactElement}) =>
    <Use hook={hook}>{children}</Use>;
}

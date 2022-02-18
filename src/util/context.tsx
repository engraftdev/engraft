import { Context, ReactNode, useContext, useMemo } from "react";

export interface AddToContextProps<V> {
  context: Context<{[k: string]: V}>,
  k: string,
  v: V,
  children?: ReactNode | undefined,
}

export function AddToContext<V>({context, k, v, children}: AddToContextProps<V>) {
  const oldValue = useContext(context);
  const newValue = useMemo(() => {
    return {...oldValue, [k]: v};
  }, [oldValue, k, v])

  return <context.Provider value={newValue}>
    {children}
  </context.Provider>
}

export interface AddObjToContextProps<V> {
  context: Context<{[k: string]: V}>,
  obj: {[k: string]: V},
  children?: ReactNode | undefined,
}

export function AddObjToContext<V>({context, obj, children}: AddObjToContextProps<V>) {
  const oldValue = useContext(context);
  const newValue = useMemo(() => {
    return {...oldValue, ...obj};
  }, [oldValue, obj])

  return <context.Provider value={newValue}>
    {children}
  </context.Provider>
}
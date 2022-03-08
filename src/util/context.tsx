import { Context, memo, ReactNode, useContext, useMemo } from "react";

export interface AddToContextProps<V> {
  context: Context<{[k: string]: V}>,
  k: string,
  v: V,
  children?: ReactNode | undefined,
}
const AddToContextNoMemo = <V extends unknown>({context, k, v, children}: AddToContextProps<V>) => {
  const oldValue = useContext(context);
  const newValue = useMemo(() => {
    return {...oldValue, [k]: v};
  }, [oldValue, k, v])

  return <context.Provider value={newValue}>
    {children}
  </context.Provider>
}
export const AddToContext = memo(AddToContextNoMemo) as typeof AddToContextNoMemo;

export interface AddObjToContextProps<V> {
  context: Context<{[k: string]: V}>,
  obj: {[k: string]: V},
  children?: ReactNode | undefined,
}
const AddObjToContextNoMemo = <V extends unknown>({context, obj, children}: AddObjToContextProps<V>) => {
  const oldValue = useContext(context);
  const newValue = useMemo(() => {
    return {...oldValue, ...obj};
  }, [oldValue, obj])

  return <context.Provider value={newValue}>
    {children}
  </context.Provider>
}
export const AddObjToContext = memo(AddObjToContextNoMemo) as typeof AddObjToContextNoMemo;
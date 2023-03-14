import { useEffect, useState } from "react";
import { EngraftPromise, PromiseState } from "./EngraftPromise.js";

export function usePromiseState<T>(promise: EngraftPromise<T>): PromiseState<T> {
  const [state, setState] = useState<PromiseState<T>>(() => EngraftPromise.state(promise));

  useEffect(() => {
    let upToDate = true;
    const update = () => {
      if (upToDate) {
        setState(EngraftPromise.state(promise));
      }
    };
    promise.then(update, update);
    update();
    return () => { upToDate = false; };
  }, [promise]);

  return state;
};

// no reason to `memo()` this; the `children` function will always be fresh anyway
export function UsePromiseState<T>(props: {
  promise: EngraftPromise<T>,
  children: (state: PromiseState<T>) => React.ReactElement | null,
}) {
  const state = usePromiseState(props.promise);
  return props.children(state);
}

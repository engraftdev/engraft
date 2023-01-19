import { useEffect, useState } from "react";
import { EngraftPromise, PromiseState } from "src/engraft/EngraftPromise";

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

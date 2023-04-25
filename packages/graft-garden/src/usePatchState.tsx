import { useMemo, useState } from "react";
import { Patch } from "./db.js";
import { EngraftPromise, VarBindings, useUpdateProxy } from "@engraft/hostkit";

export function usePatchState(patch: Patch) {
  const [state, setState] = useState(() => patch.initialStateJSON && JSON.parse(patch.initialStateJSON));
  const stateUP = useUpdateProxy(setState);

  const varBindings: VarBindings = useMemo(() => {
    if (patch.initialStateJSON === undefined) {
      const varBindings: VarBindings = {};
      return varBindings;
    } else {
      const stateVarId = 'IDstate000000';
      const stateUPVarId = 'IDstateUP000000';

      return {
        [stateVarId]: {
          var_: {id: stateVarId, label: 'state'},
          outputP: EngraftPromise.resolve({ value: state })
        },
        [stateUPVarId]: {
          var_: {id: stateUPVarId, label: 'stateUP'},
          outputP: EngraftPromise.resolve({ value: stateUP })
        },
      };
    }
  }, [patch.initialStateJSON, state, stateUP]);

  return { state, stateUP, varBindings }
}

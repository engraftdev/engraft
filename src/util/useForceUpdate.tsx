import { useReducer } from "react";

export default function useForceUpdate(): () => void {
  return useReducer(x => x + 1, 0)[1];
}
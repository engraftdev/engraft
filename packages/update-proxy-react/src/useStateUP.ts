import { UpdateProxy } from "@engraft/update-proxy";
import { useState } from "react";
import { useUpdateProxy } from "./useUpdateProxy.js";

export function useStateUP<T>(init: () => T): [T, UpdateProxy<T>] {
  const [t, setT] = useState(init);
  const tUP = useUpdateProxy(setT);
  return [t, tUP];
}

import { useEffect } from "react";
export default function useLogLifecycle(label: string) {
  useEffect(() => {
    console.log("mounting", label);
    return () => console.log("unmounting", label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

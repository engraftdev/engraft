import { MutableRefObject, useState, useRef, useEffect } from "react";

export default function useHover<T>(): [MutableRefObject<T>, boolean] {
  const [value, setValue] = useState<boolean>(false);
  const ref: any = useRef<T | null>(null);
  const handleMouseOver = (): void => setValue(true);
  const handleMouseOut = (): void => setValue(false);
  useEffect(
    () => {
      const node: any = ref.current;
      if (node) {
        node.addEventListener("mouseenter", handleMouseOver);
        node.addEventListener("mouseleave", handleMouseOut);
        return () => {
          node.removeEventListener("mouseenter", handleMouseOver);
          node.removeEventListener("mouseleave", handleMouseOut);
        };
      }
    },
    [ref.current] // Recall only if ref changes
  );
  return [ref, value];
}
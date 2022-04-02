import { useEffect, useState } from "react";

export default function useHover(): [(elem: HTMLElement | null) => void, boolean] {
  const [value, setValue] = useState<boolean>(false);
  const [elem, setElem] = useState<HTMLElement | null>(null);
  const handleMouseOver = (): void => setValue(true);
  const handleMouseOut = (): void => setValue(false);
  useEffect(
    () => {
      if (elem) {
        elem.addEventListener("mouseenter", handleMouseOver);
        elem.addEventListener("mouseleave", handleMouseOut);
        return () => {
          elem.removeEventListener("mouseenter", handleMouseOver);
          elem.removeEventListener("mouseleave", handleMouseOut);
        };
      }
    },
    [elem]
  );
  return [setElem, value];
}
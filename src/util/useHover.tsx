import { useEffect, useLayoutEffect, useState } from "react";
import { hookToComponent } from "./Use";

let mouseClientX: number;
let mouseClientY: number;
window.addEventListener("mousemove", (ev) => {
	mouseClientX = ev.clientX;
  mouseClientY = ev.clientY;
})

export default function useHover(): [(elem: HTMLElement | null) => void, boolean] {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [elem, setElem] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (elem) {
      let box = elem.getBoundingClientRect();
      setIsHovered(
        box.left <= mouseClientX && mouseClientX <= box.right &&
        box.top <= mouseClientY && mouseClientY <= box.bottom
      )
    }
  }, [elem])

  useEffect(() => {
    if (elem) {
      const setIsHoveredTrue = () => setIsHovered(true);
      const setIsHoveredFalse = () => setIsHovered(false);
      elem.addEventListener("mouseenter", setIsHoveredTrue);
      elem.addEventListener("mouseleave", setIsHoveredFalse);
      return () => {
        elem.removeEventListener("mouseenter", setIsHoveredTrue);
        elem.removeEventListener("mouseleave", setIsHoveredFalse);
      };
    }
  }, [elem]);

  return [setElem, isHovered];
}

export const UseHover = hookToComponent(useHover);
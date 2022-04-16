import { useCallback, useLayoutEffect, useState } from "react";
import { hookToComponent } from "./Use";
import { useElementEventListener } from "./useEventListener";

let mouseClientX: number;
let mouseClientY: number;
window.addEventListener("mousemove", (ev) => {
	mouseClientX = ev.clientX;
  mouseClientY = ev.clientY;
})

export default function useHover(): [(elem: HTMLElement | null) => void, boolean, HTMLElement | null] {
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

  useElementEventListener(elem, 'mouseenter', useCallback(() => setIsHovered(true), []));
  useElementEventListener(elem, 'mouseleave', useCallback(() => setIsHovered(false), []));

  return [setElem, isHovered, elem];
}

export const UseHover = hookToComponent(useHover);

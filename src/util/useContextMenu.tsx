import { memo, ReactNode, useCallback, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useWindowEventListener } from "./useEventListener";

export type UseContextMenu = {
  openMenu: (e: React.MouseEvent) => void,
  menuNode: ReactNode,
}

export type MenuMaker = (closeMenu: () => void) => ReactNode

export function useContextMenu(menuMaker: MenuMaker): UseContextMenu {
  const [position, setPosition] = useState<{x: number, y: number} | null>(null);

  const openMenu = useCallback((ev: React.MouseEvent) => {
    ev.preventDefault();
    setPosition({x: ev.pageX, y: ev.pageY});
  }, []);

  const closeMenu = useCallback(() => {
    setPosition(null);
  } , []);

  let menuNode: ReactNode | null = null;
  if (position) {
    menuNode = ReactDOM.createPortal(
      <Menu position={position} closeMenu={closeMenu}>
        {menuMaker(closeMenu)}
      </Menu>,
      window.document.body
    ) as any;  // no clue why this isn't type-checking; meh
  }

  return {
    openMenu,
    menuNode,
  }
}

type MenuProps = {
  position: {x: number, y: number},
  children: ReactNode,
  closeMenu: () => void,
}

const Menu = memo((props: MenuProps) => {
  const { position, children, closeMenu } = props

  const menuRef = useRef<HTMLDivElement>(null)

  useWindowEventListener('mousedown', useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
      closeMenu()
    }
  }, [closeMenu]));

  return (
    <div
      ref={menuRef}
      style={{ position: 'absolute', left: position.x, top: position.y }}
    >
      {children}
    </div>
  );
});

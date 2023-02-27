import { memo } from "react";
import myContextMenuCss from "./MyContextMenu.css?inline";

export const MyContextMenu = memo(function MyContextMenu(props: { children: React.ReactNode }) {
  const { children } = props;

  return <>
    <style>{myContextMenuCss}</style>
    <div className="MyContextMenu live-compose-root">
      {children}
    </div>
  </>;
});

export const MyContextMenuHeading = memo(function MyContextMenuHeading(props: { children: React.ReactNode }) {
  const { children } = props;
  return <div className="MyContextMenu-divider" style={{height: 18}}>
    <span style={{
      display: 'inline-block',
      background: 'white',
      marginLeft: '5px',
      fontSize: 9,
    }}>{children}</span>
  </div>
});

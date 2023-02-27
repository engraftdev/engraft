import { createContext, memo, MouseEvent, useCallback, useContext } from "react";
import { at, atIndex, Updater } from "../util/immutable";
import useHover from "../util/useHover";
import { SubValueHandleProps, Value, ValueCustomizations, ValueProps } from "./Value";

const ValueEditableContext = createContext<Updater<any> | undefined>(undefined);

function atPath(updater: Updater<any>, path: (string | number)[]): Updater<any> {
  if (path.length === 0) {
    return updater;
  }

  const initPath = path.slice(0, -1);
  const lastStep = path[path.length - 1];
  if (typeof lastStep === 'string') {
    return at(atPath(updater, initPath), lastStep);
  } else {
    return atIndex(atPath(updater, initPath), lastStep);
  }
}

export const SubValueHandle = memo(function SubValueHandle({value, path, children}: SubValueHandleProps) {
  const updater = useContext(ValueEditableContext);

  const [hoverRef, isHovered, elem] = useHover();

  const onClick = useCallback((ev: MouseEvent) => {
    if (!updater || !path) { return false; }
    ev.preventDefault();
    let defaultStr: string | undefined = undefined;
    try {
      defaultStr = JSON.stringify(value);
    } catch { }
    // TODO: pop up in correct window
    const win = elem?.ownerDocument.defaultView || window;
    const newValueStr = win.prompt("New value JSON", defaultStr);
    if (newValueStr !== null) {
      try {
        const newValue = JSON.parse(newValueStr);
        atPath(updater, path)(() => newValue);
      } catch { }
    }
    return false;
  }, [elem, path, updater, value])

  if (!path) {
    return <>{children}</>;
  }

  return <div
    ref={hoverRef}
    style={{
      userSelect: 'none',  // todo
      minWidth: 0,
      marginLeft: "-0.125rem",
      marginRight: "-0.125rem",
      paddingLeft: "0.125rem",
      paddingRight: "0.125rem",
      borderRadius: "0.125rem",
      ...isHovered && {
        backgroundColor: "rgba(0,0,220,0.3)",
      },
    }}
    onClick={onClick}
  >
    {children}
  </div>
})

const editableCustomizations: ValueCustomizations = {
  SubValueHandle
}

interface ValueEditableProps extends ValueProps {
  updater: Updater<any>;
}

export const ValueEditable = memo(function ValueEditable (props: ValueEditableProps) {
  const {updater, customizations, ...rest} = props

  return <ValueEditableContext.Provider value={updater}>
    <Value {...rest} customizations={{...editableCustomizations, ...editableCustomizations}}/>
  </ValueEditableContext.Provider>
})

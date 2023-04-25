import { createContext, memo, MouseEvent, useCallback, useContext } from "react";
import { SubValueHandleProps, Value, ValueCustomizations, ValueProps } from "./Value.js";
import { Updater } from "@engraft/shared/lib/Updater.js";
import { useHover } from "@engraft/shared/lib/useHover.js";
import { UpdateProxy, useUpdateProxy } from "@engraft/update-proxy-react";


const ValueEditableContext = createContext<Updater<any> | undefined>(undefined);

function atPath(up: UpdateProxy<any>, path: (string | number)[]): UpdateProxy<any> {
  for (const step of path) {
    up = up[step];
  }
  return up;
}

export const SubValueHandle = memo(function SubValueHandle({value, path, children}: SubValueHandleProps) {
  const updater = useContext(ValueEditableContext);
  const valueUP = useUpdateProxy(updater);

  const [hoverRef, isHovered, elem] = useHover();

  const onClick = useCallback((ev: MouseEvent) => {
    if (!valueUP || !path) { return false; }
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
        atPath(valueUP, path).$set(newValue);
      } catch { }
    }
    return false;
  }, [elem, path, valueUP, value])

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

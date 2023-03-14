import React from "react";

interface Props extends React.HTMLProps<HTMLDivElement> {
  element: HTMLElement | SVGSVGElement | undefined,
}

export function DOM({element, ...rest}: Props) {
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (container) {
      while (container.lastChild) {
        container.removeChild(container.lastChild);
      }
      if (element) {
        if (element.isConnected) {
          container.appendChild(element.cloneNode(true));
        } else {
          container.appendChild(element);
        }
      }
    }
  }, [container, element])

  return <div ref={setContainer} {...rest} />
}

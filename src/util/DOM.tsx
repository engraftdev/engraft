import React from 'react';

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
        // TODO: if you don't clone, you can't display it multiple times
        // but if you DO clone, you can't have canvases
        // boo

        // container.appendChild(children.cloneNode(true));
        container.appendChild(element);
      }
    }
  }, [container, element])

  return <div ref={setContainer} {...rest} />
}

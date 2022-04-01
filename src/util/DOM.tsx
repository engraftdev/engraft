import React from 'react';

interface Props extends React.HTMLProps<HTMLDivElement> {
  children: HTMLElement | SVGSVGElement | undefined,
}

export function DOM({children, ...rest}: Props) {
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (container) {
      while (container.lastChild) {
        container.removeChild(container.lastChild);
      }
      if (children) {
        // TODO: if you don't clone, you can't display it multiple times
        // but if you DO clone, you can't have canvases
        // boo

        // container.appendChild(children.cloneNode(true));
        container.appendChild(children);
      }
    }
  }, [children, container])

  return <div ref={setContainer} {...rest} />
}

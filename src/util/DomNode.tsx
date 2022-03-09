import React from 'react';

interface Props extends React.HTMLProps<HTMLDivElement> {
  node: HTMLElement | undefined,
}

function DomNode({node, ...rest}: Props) {
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (container) {
      while (container.lastChild) {
        container.removeChild(container.lastChild);
      }
      if (node) {
        container.appendChild(node);
      }
    }
  }, [node, container])

  return <div ref={setContainer} {...rest} />
}

export default DomNode;

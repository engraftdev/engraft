import { HTMLProps, memo, useCallback, useState } from "react";
import ReactDOM from "react-dom";

interface Props extends HTMLProps<HTMLDivElement> {
}

const ShadowDOM = memo(({children, ...rest}: Props) => {
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

  const onDiv = useCallback((div: HTMLDivElement | null) => {
    if (div) {
      setShadowRoot(div.shadowRoot || div.attachShadow({ mode: 'open' }));

    } else {
      setShadowRoot(null);
    }
  }, [])

  return <>
    <div ref={onDiv} {...rest}/>
    {shadowRoot && ReactDOM.createPortal(children, shadowRoot as unknown as Element)}
  </>;
});
export default ShadowDOM

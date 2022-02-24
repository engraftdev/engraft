import rootCss from './root.css';
import highlightCss from './highlight.css';
import { HTMLProps, ReactElement } from 'react';
import ShadowDOM from '../util/ShadowDOM';

export function RootStyles() {
  return <style>
    {rootCss}
    {highlightCss}
  </style>
}

export default function IsolateStyles({children, ...props}: HTMLProps<HTMLDivElement>) {
  return <ShadowDOM style={{...(props.style || {}), all: 'initial'}} {...props}>
    <RootStyles/>
    <div className="live-compose-root">
      {children}
    </div>
  </ShadowDOM>;
}
import rootCss from './root.css';
import highlightCss from './highlight.css';
import { HTMLProps, ReactElement } from 'react';

export function RootStyles() {
  return <style>
    {rootCss}
    {highlightCss}
  </style>
}

export default function IsolateStyles({children, ...props}: HTMLProps<HTMLDivElement>) {
  return <div style={{...props.style, all: 'initial'}} {...props}>
    <RootStyles/>
    <div className="live-compose-root">
      {children}
    </div>
  </div>;
}
// import stringify from "json-stringify-pretty-compact";
import './highlight-style.css'
import stringify from "../util/stringify";
import { HTMLProps, useMemo } from "react";
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import ScrollShadow from './ScrollShadow';
hljs.registerLanguage('javascript', javascript);

interface Props extends HTMLProps<HTMLDivElement> {
  value: any;
}

export default function Value({value, style, ...props}: Props) {
  const html = useMemo(() => {
    if (!value) { return; }
    const stringified = stringify(value);
    return hljs.highlight(stringified, {language: 'javascript'}).value;
  }, [value])

  //, boxShadow: 'inset 0 0 2px 1px rgba(0,0,0,0.2)'
  return <ScrollShadow style={{...style, overflow: 'scroll'}} {...props}>
    {html && <pre dangerouslySetInnerHTML={{__html: html}} />}
  </ScrollShadow>
}
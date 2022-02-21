// import stringify from "json-stringify-pretty-compact";
import './highlight-style.css'
import stringify from "../util/stringify";
import { useMemo } from "react";
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
hljs.registerLanguage('javascript', javascript);

interface Props {
  value: any;
}

export default function Value({value}: Props) {
  const html = useMemo(() => {
    if (!value) { return; }
    const stringified = stringify(value);
    console.log("stringified", stringified);
    return hljs.highlight(stringified, {language: 'javascript'}).value;
  }, [value])

  return <div style={{fontSize: "100%"}}>
    {html && <pre dangerouslySetInnerHTML={{__html: html}} />}
  </div>
}
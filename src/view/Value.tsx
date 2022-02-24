// import stringify from "json-stringify-pretty-compact";
import stringify from "../util/stringify";
import React, { CSSProperties, HTMLProps, isValidElement, useMemo } from "react";
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import ScrollShadow from './ScrollShadow';
import { ObjectInspector } from 'react-inspector';
import * as _ from 'lodash';
hljs.registerLanguage('javascript', javascript);

interface Props extends HTMLProps<HTMLDivElement> {
  value: any;
}

export default function Value({value, style, ...props}: Props) {
  const contents = useMemo(() => {
    if (isValidElement(value)) {
      return value;
    }

    let stringified: string | undefined;
    try {
      stringified = stringify(value);
      try {
        if (stringified && !_.isEqual(value, JSON.parse(JSON.stringify(value)))) {
          stringified = undefined;
        }
      } catch {
        console.log("TROUBLE PARSING", value, stringified);
        stringified = undefined;
      }
    } catch {}
    if (stringified) {
      let style : CSSProperties = {};
      if (typeof value === 'string') {
        style.whiteSpace = 'pre-wrap';
      }
      const html = hljs.highlight(stringified, {language: 'javascript'}).value;
      return <pre dangerouslySetInnerHTML={{__html: html}} style={style} />;
    } else {
      return <ObjectInspector data={value}/>
    }
  }, [value])

  //, boxShadow: 'inset 0 0 2px 1px rgba(0,0,0,0.2)'
  return <ScrollShadow className="Value" style={{...style, overflow: 'auto'}} {...props}>
    {contents}
  </ScrollShadow>
}
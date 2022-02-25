// import stringify from "json-stringify-pretty-compact";
import stringify from "../util/stringify";
import React, { CSSProperties, HTMLProps, isValidElement, useEffect, useMemo } from "react";
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import ScrollShadow from './ScrollShadow';
import { ObjectInspector } from 'react-inspector';
import * as _ from 'lodash';
import ErrorBoundary from "../util/ErrorBoundary";
import { ToolValue } from "../tools-framework/tools";
import { useStateSetOnly } from "../util/state";
hljs.registerLanguage('javascript', javascript);


function replacer(key: any, value: any): any {
  if (typeof value === 'number') {
    return Number(value.toFixed(3));
  }
  return value;
}

export interface ValueProps extends HTMLProps<HTMLDivElement> {
  value: any;
}

export default function Value({value, style, ...props}: ValueProps) {
  const contents = useMemo(() => {
    if (isValidElement(value)) {
      return <ErrorBoundary>{value}</ErrorBoundary>;
    }

    let stringified: string | undefined;
    try {
      stringified = stringify(value, {replacer});
      try {
        if (stringified && !_.isEqual(value, JSON.parse(JSON.stringify(value)))) {
          stringified = undefined;
        }
      } catch {
        console.log("TROUBLE PARSING", value, stringified);
        stringified = undefined;
      }
    } catch (e) {
    }
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

export interface ToolValueProps extends HTMLProps<HTMLDivElement> {
  toolValue: ToolValue | null;
}

// TODO: awful naming huh?
export function ValueOfTool({toolValue, style, ...props}: ToolValueProps) {
  const [lastValue, setLastValue] = useStateSetOnly<ToolValue | null>(null);

  useEffect(() => {
    if (toolValue) {
      setLastValue(toolValue);
    }
  }, [setLastValue, toolValue])

  return lastValue ?
    <Value
      value={lastValue.toolValue}
      style={{...style, opacity: toolValue === null ? 0.3 : 1}}
      {...props}
    /> :
    <div style={{fontSize: 13, fontStyle: 'italic'}}>
      no output yet
    </div>;
}
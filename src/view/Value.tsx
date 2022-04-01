// import stringify from "json-stringify-pretty-compact";
import stringify from "../util/stringify";
import React, { CSSProperties, HTMLProps, isValidElement, memo, ReactElement, useEffect, useMemo } from "react";
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import ScrollShadow from './ScrollShadow';
import { ObjectInspector } from 'react-inspector';
import * as _ from 'lodash';
import ErrorBoundary from "../util/ErrorBoundary";
import { ToolValue } from "../tools-framework/tools";
import { useStateSetOnly } from "../util/state";
import { DOM } from "../util/DOM";
import { saveFile } from "../util/saveFile";
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

const Value = memo(({value, style, ...props}: ValueProps) => {
  const contents: {type?: string, elem: ReactElement} = useMemo(() => {
    if (isValidElement(value)) {
      return {
        type: 'react element',
        elem: <ErrorBoundary>{value}</ErrorBoundary>,
      };
    }
    if (value instanceof HTMLElement || value instanceof SVGSVGElement) {
      return {
        type: 'html element',
        elem: <DOM>{value}</DOM>,
      };
    }
    if (value instanceof Blob) {
      return {
        type: 'blob',
        elem: <button onClick={() => saveFile(value, 'file')}>download</button>,
      }
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
      return { elem: <pre dangerouslySetInnerHTML={{__html: html}} style={style} /> };
    } else {
      return { elem: <ObjectInspector data={value}/> }
    }
  }, [value])

  //, boxShadow: 'inset 0 0 2px 1px rgba(0,0,0,0.2)'
  const withShadow = <ScrollShadow className="Value" style={{...style, overflow: 'auto'}} {...props}>
    {contents.elem}
  </ScrollShadow>

  if (contents.type) {
    return <div style={{display: 'inline-flex', flexDirection: 'column', maxWidth: '100%'}}>
      <div style={{height: 15, background: '#e4e4e4', fontSize: 13, color: '#0008', display: 'flex'}}>{contents.type}</div>
      <div style={{border: '1px dashed gray'}}>
        {withShadow}
      </div>
    </div>;
  } else {
    return withShadow;
  }
});
export default Value;


export type ToolValueProps = Omit<HTMLProps<HTMLDivElement>, 'ref'> & {
  toolValue: ToolValue | null;
}

// TODO: awful naming huh?
export const ValueOfTool = memo(({toolValue, style, ...props}: ToolValueProps) => {
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
});
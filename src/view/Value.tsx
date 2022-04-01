import { CSSProperties, HTMLProps, isValidElement, memo, ReactElement, ReactNode, useEffect } from "react";
import { ObjectInspector } from 'react-inspector';
import { ToolValue } from "../tools-framework/tools";
import { DOM } from "../util/DOM";
import ErrorBoundary from "../util/ErrorBoundary";
import { saveFile } from "../util/saveFile";
import { useStateSetOnly } from "../util/state";
import ScrollShadow from './ScrollShadow';
import { flexCol, flexRow, inlineBlock } from "./styles";



export const ValueFrame = memo(({children, type, style, ...props}: {type?: string} & HTMLProps<HTMLDivElement>) => {
  const withShadow = <ScrollShadow className="Value" style={{...style, overflow: 'auto'}} {...props}>
    {children}
  </ScrollShadow>

  if (type) {
    return <div style={{display: 'inline-flex', flexDirection: 'column', maxWidth: '100%', alignItems: 'start'}}>
      <div style={{height: 15, background: '#e4e4e4', fontSize: 13,
                   color: '#0008', display: 'flex',
                   borderTopLeftRadius: 5, borderTopRightRadius: 5, paddingLeft: 3, paddingRight: 3}}>
        {type}
      </div>
      <div style={{border: '1px dashed gray'}}>
        {withShadow}
      </div>
    </div>;
  } else {
    return withShadow;
  }
});

const valueFont: CSSProperties = {
  fontSize: 11,
  fontFamily: 'Menlo, monospace',
}

const spacing: CSSProperties = {
  marginBottom: 3,
}

export interface ValueProps {
  value: unknown;
  prefix?: ReactNode;
  path?: string;
}

export const Indent = memo(({children}: {children: ReactNode}) =>
  <div style={{marginLeft: 10, ...flexCol(), ...spacing}}>
    {children}
  </div>
);

export const WithPrefix = memo(({children, prefix}: {children: ReactElement, prefix: ReactNode}) => {
  if (prefix) {
    return <div style={{...flexRow()}}>
      {prefix}
      {children}
    </div>
  } else {
    return children;
  }
});

export const Value = memo(({value, prefix, path = '$'}: ValueProps) => {
  const maybeElement = value as {} | null | undefined;

  if (isValidElement(maybeElement)) {
    return <>
      {prefix}
      <Indent>
        <ValueFrame type='react element'>
          <ErrorBoundary>{maybeElement}</ErrorBoundary>,
        </ValueFrame>
      </Indent>
    </>
  }

  if (value instanceof HTMLElement || value instanceof SVGSVGElement) {
    return <>
      {prefix}
      <Indent>
        <ValueFrame type='html element'>
          <DOM>{value}</DOM>
        </ValueFrame>
      </Indent>
    </>
  }

  if (value instanceof Blob) {
    return <>
      {prefix}
      <Indent>
        <ValueFrame type='blob'>
          <button onClick={() => saveFile(value, 'file')}>download</button>,
        </ValueFrame>
      </Indent>
    </>;
  }

  if (value instanceof Object && !(value instanceof Function)) {
    const isArray = value instanceof Array;
    return <>
      <WithPrefix prefix={prefix}>
        <span style={valueFont} title={path}>{isArray ? '[' : '{'}</span>
      </WithPrefix>
      <Indent>
        {Object.entries(value).map(([key, value]) =>
          <Value
            value={value}
            prefix={
              !isArray &&
              <div style={{...inlineBlock(), ...valueFont, marginRight: 5}}>{key}:</div>
            }
            path={path + '.' + key}
          />
        )}
      </Indent>
      <span style={valueFont}>{isArray ? ']' : '}'}</span>
    </>;
  }

  if (typeof value === 'number') {
    return <WithPrefix prefix={prefix}>
      <div style={{color: 'rgb(28, 0, 207)', ...valueFont}}>
        {/* TODO: needs some work */}
        {Number(value.toFixed(3))}
      </div>
    </WithPrefix>;
  }

  if (typeof value === 'boolean') {
    return <WithPrefix prefix={prefix}>
      <div style={{color: 'rgb(28, 0, 207)', ...valueFont}}>
        {value ? 'true' : 'false'}
      </div>
    </WithPrefix>
  }

  if (typeof value === 'string') {
    return <WithPrefix prefix={prefix}>
      <ValueFrame>
        <div style={{color: 'rgb(196, 26, 22)', ...valueFont}}>
          '{value}'
        </div>
      </ValueFrame>
    </WithPrefix>
  }

  return <WithPrefix prefix={prefix}>
    <ValueFrame>
      <ObjectInspector data={value}/>
    </ValueFrame>
  </WithPrefix>
})


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
    <div style={{
      ...style,
      opacity: toolValue === null ? 0.3 : 1,
    }} {...props}>
      <Value value={lastValue.toolValue} />
    </div> :
    <div style={{fontSize: 13, fontStyle: 'italic'}}>
      no output yet
    </div>;
});
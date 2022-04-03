import { CSSProperties, HTMLProps, isValidElement, memo, ReactElement, ReactNode, useEffect, useState } from "react";
import { ObjectInspector } from 'react-inspector';
import { ToolValue } from "../tools-framework/tools";
import { count } from "../util/count";
import { DOM } from "../util/DOM";
import ErrorBoundary from "../util/ErrorBoundary";
import { saveFile } from "../util/saveFile";
import { useStateSetOnly } from "../util/state";
import { Use } from "../util/Use";
import useHover, { UseHover } from "../util/useHover";
import { useKeyHeld } from "../util/useKeyHeld";
import ScrollShadow from './ScrollShadow';
import { flexCol, flexRow, inlineBlock } from "./styles";



export const ValueFrame = memo(function ValueFrame({children, type, style, ...props}: {type?: string} & HTMLProps<HTMLDivElement>) {
  const withShadow = <ScrollShadow className="ValueFrame-shadow" style={{...style, overflow: 'auto'}} {...props}>
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

export const Indent = memo(function Indent({children, style}: {children: ReactNode, style?: CSSProperties}) {
  return <div style={{marginLeft: 10, ...flexCol('left'), ...style}}>
    {children}
  </div>;
});

export const SubValueHandle = memo(function SubValueHandle({isTopLevelHovered, children}: {isTopLevelHovered: boolean, children: ReactNode}) {
  const metaHeld = useKeyHeld('Meta');

  return <div style={{...isTopLevelHovered && metaHeld && highlight}}>
    {children}
  </div>
})

export const WithPrefix = memo(function WithPrefix({children, prefix}: {children: ReactElement, prefix: ReactNode}) {
  if (prefix) {
    return <div className='WithPrefix-row' style={{...flexRow()}}>
      {prefix}
      {children}
    </div>
  } else {
    return children;
  }
});

function pathString(path: string[]) {
  return `$.${path.join('.')}`;
}

export interface ValueProps {
  value: unknown;
  prefix?: ReactNode;
  path?: string[];
  isTopLevel?: boolean;
  isTopLevelHovered?: boolean;
}

const highlight: CSSProperties = {
  marginLeft: "-0.125rem",
  marginRight: "-0.125rem",
  paddingLeft: "0.125rem",
  paddingRight: "0.125rem",
  borderRadius: "0.125rem",
  backgroundColor: "rgba(0,0,0,0.1)",
}

export const Value = memo(function Value({value, prefix, path = [], isTopLevel = true, isTopLevelHovered}: ValueProps) {
  const metaHeld = useKeyHeld('Meta');

  if (isTopLevel) {
    return <UseHover children={([hoverRef, isHovered]) =>
      <div ref={hoverRef}>
        <Value {...{value, prefix, path, isTopLevel: false, isTopLevelHovered: isHovered}} />
      </div>
    }/>
  }

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
    return <ValueComposite value={value} prefix={prefix} path={path} isTopLevelHovered={isTopLevelHovered}/>
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
      {/* <div style={{...metaHeld && highlight, maxWidth: '100%',}}> */}
        <ValueFrame style={{...isTopLevelHovered && metaHeld && highlight}}>
          <div
              className='Value-is-string'
              // todo: hacky hanging indent
              style={{color: 'rgb(196, 26, 22)', ...valueFont, textIndent: -6, paddingLeft: 6}}
            >
            '{value}'
          </div>
        </ValueFrame>
      {/* </div> */}
    </WithPrefix>
  }

  return <WithPrefix prefix={prefix}>
    <ValueFrame>
      <ObjectInspector data={value}/>
    </ValueFrame>
  </WithPrefix>
})


const ValueComposite = memo(function ValueComposite({value, prefix, path = [], isTopLevelHovered = false}: ValueProps & {value: Object}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const isArray = value instanceof Array;

  if (isExpanded) {
    return <>
      <WithPrefix prefix={prefix}>
        <Use hook={useHover} children={([hoverRef, isHovered]) =>
          <div className='ValueComposite-open-row' ref={hoverRef} style={{...flexRow(), flexGrow: 1}}>
            <span style={valueFont} title={pathString(path)}>{isArray ? '[' : '{'}</span>
            { isHovered &&
              <div style={{...valueFont, marginLeft: 3, cursor: 'pointer', flexGrow: 1}} onClick={() => setIsExpanded(false)}>⊖</div>
            }
          </div>
        }/>
      </WithPrefix>
      <Indent style={{padding: 1}}>
        {Object.entries(value).map(([key, value]) =>
          <div className='ValueComposite-item' style={{
            marginTop: 1,
            marginBottom: 1,
            maxWidth: '100%',
          }}>
            <Value
              key={key}
              value={value}
              prefix={
                !isArray &&
                <div className='prefix-with-key' style={{...inlineBlock(), ...valueFont, marginRight: 5}} title={pathString([...path, key])}>{key}:</div>
              }
              path={[...path, key]}
              isTopLevel={false}
              isTopLevelHovered={isTopLevelHovered}
            />
          </div>
        )}
      </Indent>
      <span className='ValueComposite-close' style={valueFont}>{isArray ? ']' : '}'}</span>
    </>;
  } else {
    let abbreviated: ReactElement;

    if (isArray) {
      abbreviated = <>
        [
        <span style={{fontStyle: 'italic', marginLeft: 3, marginRight: 3, opacity: 0.5}} title={pathString(path)}>
          {count(value.length, 'element', 'elements')}
        </span>
        ]
      </>
    } else {
      abbreviated = <SubValueHandle isTopLevelHovered={isTopLevelHovered}>
        {'{'}
        <span style={{fontStyle: 'italic', marginLeft: 3, marginRight: 3, opacity: 0.5}} title={pathString(path)}>
          {Object.keys(value).join(', ')}
        </span>
        {'}'}
      </SubValueHandle>
    }
    return <WithPrefix prefix={prefix}>
      <div
          title={pathString(path)}
          style={{...valueFont, ...flexRow(), flexGrow: 1, cursor: 'pointer'}}
          onClick={() => setIsExpanded(true)}>
        {abbreviated}
        {/* { isHovered &&
          <span style={{...valueFont, marginLeft: 3, cursor: 'pointer', flexGrow: 1}} onClick={() => setIsExpanded(true)}>⊕</span>
        } */}
      </div>
    </WithPrefix>
  }
})





export type ValueOfToolProps = Omit<HTMLProps<HTMLDivElement>, 'ref'> & {
  toolValue: ToolValue | null;
}

// TODO: awful naming huh?
export const ValueOfTool = memo(function ValueOfTool({toolValue, style, ...props}: ValueOfToolProps) {
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

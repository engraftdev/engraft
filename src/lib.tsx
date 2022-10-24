import _ from "lodash";
import { Dispatch, memo, MouseEvent as ReactMouseEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { slotSetTo } from "./builtin-tools/slot";
import { builtinTools } from "./builtinTools";
import libCss from "./lib.css";
import { hasValue, registerTool, ToolOutput, ToolProgram, ToolView, VarBinding } from "./tools-framework/tools";
import { ToolWithView } from "./tools-framework/ToolWithView";
import { ShowView, useTool } from "./tools-framework/useSubTool";
import { DOM } from "./util/DOM";
import { ObservableInspector } from "./util/ObservableInspector";
import { Setter, useStateSetOnly, useStateUpdateOnly } from "./util/state";
import { useDedupe } from "./util/useDedupe";
import { RootStyles } from "./view/IsolateStyles";
import { ToolOutputBuffer, ToolOutputView, Value } from "./view/Value";
import { VarDefinition } from "./view/Vars";



builtinTools.map(registerTool);

////////////////////
// EmbedComponent //
////////////////////

// TODO: This is the old guy, for Observable. It should be removed eventually.

interface EmbedComponentProps {
  reportOutput: Setter<ToolOutput | null>;
  variables: {[name: string]: any} | undefined
  initialProgramJson: string | undefined;
}

export const EmbedComponent = memo(function EmbedComponent({variables, initialProgramJson, reportOutput}: EmbedComponentProps) {
  const [program, updateProgram] = useStateUpdateOnly<ToolProgram>(slotSetTo(''));
  useEffect(() => {
    if (!initialProgramJson) { return; }
    try {
      const initialProgram: ToolProgram = JSON.parse(initialProgramJson);
      updateProgram(() => initialProgram);
    } catch {}
  }, [initialProgramJson, updateProgram])

  const varBindings = useMemo(() => {
    let varBindings: {[id: string]: VarBinding} = {};
    Object.entries(variables || {}).forEach(([name, value]) => {
      const id = `ID${name}000000`;
      varBindings[id] = {var_: {id, label: name}, output: {value: value}};
    });
    return varBindings;
  }, [variables]);

  const [output, setOutput] = useStateSetOnly<ToolOutput | null>(null);

  useEffect(() => {
    reportOutput(output);
  }, [output, reportOutput])

  const [copyPasteMessage, setCopyPasteMessage] = useStateSetOnly('');

  return <div>
    <div style={{padding: 5}}>
      <ToolOutputView toolOutput={output}/>
    </div>
    <div>
      <ToolWithView program={program} updateProgram={updateProgram} varBindings={varBindings} reportOutput={setOutput} autoFocus={true}/>
    </div>
    <div className="bottom-stuff">
      <button className="button-add" onClick={async () => {
        try {
          await navigator.clipboard.writeText(JSON.stringify(JSON.stringify(program)));
          setCopyPasteMessage('✅');
        } catch (e) {
          setCopyPasteMessage('❌' + (e instanceof Error ? ': ' + e.message : ''));
        }
      }}>Copy</button>
      {' '}
      {copyPasteMessage}
    </div>
  </div>;
});


/////////////////////
// ObservableEmbed //
/////////////////////

// TODO: This is the newer guy for Observable. It could use some de-dupe with useLiveTool. Idk.

interface ObservableEmbedProps {
  localStorageKey: string;
  reportOutput: Setter<ToolOutput | null>;
  variables: {[name: string]: any} | undefined;
}

export const ObservableEmbed = memo(function ObservableEmbed({localStorageKey, variables = {}, reportOutput}: ObservableEmbedProps) {
  const varBindings = useMemo(() => {
    let varBindings: {[id: string]: VarBinding} = {};
    Object.entries(variables || {}).forEach(([name, value]) => {
      const id = `ID${name}000000`;
      varBindings[id] = {var_: {id, label: name}, output: {value: value}};
    });
    return varBindings;
  }, [variables]);

  const [program, updateProgram] = useStateUpdateOnly<ToolProgram>(
    programFromLocalStorage(localStorageKey) || slotSetTo(defaultCodeFromVariables(variables))
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(localStorageKey, JSON.stringify(program));
    } catch (e) {
      console.warn("error saving to local storage", e);
    }
  }, [program, localStorageKey])

  const [output, setOutput] = useStateSetOnly<ToolOutput | null>(null);

  useEffect(() => {
    reportOutput(output);
  }, [output, reportOutput])

  return (
    <div style={{marginBottom: 10}}>
      <ToolOutputBuffer
        toolOutput={output}
        renderValue={(value) => <ObservableInspector value={value}/>}
      />
      <ToolWithView program={program} updateProgram={updateProgram} varBindings={varBindings} reportOutput={setOutput} autoFocus={true}/>
    </div>
  );
});

function defaultCodeFromVariables(variables: {[name: string]: any}) {
  const names = Object.keys(variables);
  const firstName: string | undefined = names[0];
  if (firstName) {
    return `ID${firstName}000000`;
  } else {
    return '';
  }
}


/////////////////
// useLiveTool //
/////////////////

export interface UseLiveToolProps {
  defaultValue: any;  // todo: distinguish undefined from missing
  hide?: boolean;
}

export function useLiveTool(variables: object = {}, {defaultValue, hide}: UseLiveToolProps) {
  // * Manage the replacement *

  // This is only set once
  const [origContainer] = useState<HTMLElement>(() => {
    return document.getElementById('root')!;
  });

  const newContainer = useMemo(() => document.createElement('div'), []);
  const newRoot = useMemo(() => createRoot(newContainer), [newContainer]);

  useEffect(() => {
    if (!hide) {
      origContainer.replaceWith(newContainer);
      return () => newContainer.replaceWith(origContainer);
    }
  }, [hide, newContainer, origContainer])


  // * Manage the tool *

  const stableVariables = useDedupe(variables, _.isEqual);

  const varBindings = useMemo(() => {
    let varBindings: {[id: string]: VarBinding} = {};
    Object.entries(stableVariables).forEach(([name, value]) => {
      const id = `ID${name}000000`;
      varBindings[id] = {var_: {id, label: name}, output: {value: value}};
    });
    return varBindings;
  }, [stableVariables]);

  const [program, updateProgram] = useStateUpdateOnly<ToolProgram>(
    programFromLocalStorage(useLiveToolDemoKey) || slotSetTo(defaultCodeFromVariables(variables))
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(useLiveToolDemoKey, JSON.stringify(program));
    } catch (e) {
      console.warn("error saving to local storage", e);
    }
  }, [program])

  const [component, view, output] = useTool({program, updateProgram, varBindings});

  const [useDefault, setUseDefault] = useState(!hide);
  useEffect(() => {
    if (!hide) {
      setUseDefault(true);
    }
  }, [hide])

  useEffect(() => {
    newRoot.render(<>
      {component}
      {!hide &&
        <Split
          left={
            <DOM element={origContainer}/>
          }
          right={
            <UseLiveToolRHS
              variables={stableVariables}
              defaultValue={defaultValue}
              view={view}
              output={output}
              useDefault={useDefault}
              setUseDefault={setUseDefault}
            />
          }
        />
      }
    </>);
  }, [component, defaultValue, varBindings, hide, newRoot, origContainer, output, stableVariables, useDefault, view]);

  return (!hide && useDefault) || !hasValue(output) ? defaultValue : output.value;
}

const useLiveToolDemoKey = 'use-live-tool-demo';

function programFromLocalStorage(key: string) {
  const programJson = window.localStorage.getItem(key)
  if (programJson) {
    return JSON.parse(programJson);
  } else {
    return undefined;
  }
}

export interface UseLiveToolRHSProps {
  variables: {[name: string]: any};
  defaultValue: any;
  output: ToolOutput | null;
  view: ToolView | null;
  useDefault: boolean;
  setUseDefault: Dispatch<boolean>;
}

export const UseLiveToolRHS = memo(function UseLiveToolRHS(props: UseLiveToolRHSProps) {
  const {variables, defaultValue, view, output, useDefault, setUseDefault} = props;
  return (
    <div style={{overflow: 'scroll', height: '100%'}}>
      <div className="LiveEditorTool">
        <style type="text/css">{libCss}</style>
        <RootStyles/>
        <div style={{display: 'flex', flexDirection: 'column', minHeight: 0}}>
          <h2>Input</h2>
          {Object.entries(variables).map(([name, value]) => {
            return <div key={name} className="xRow xAlignTop xGap10" style={{minHeight: 0}}>
              <VarDefinition var_={{id: 'idunno', label: name}}/>
              <div style={{lineHeight: 1}}>=</div>
              <div style={{minWidth: 0, minHeight: 0, height: '100%', flexGrow: 1}}>
                {/* <ValueFrame outerStyle={{ flexGrow: 1, minHeight: 0, height: '100%', display: 'flex' }}> */}
                  <Value value={value}/>
                {/* </ValueFrame> */}
              </div>
            </div>
          })}
        </div>

        <div style={{display: 'flex', flexDirection: 'column', minHeight: 0, flexShrink: 0}}>
          <h2>Tool</h2>
          <ShowView view={view}/>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', minHeight: 0}}>
          <h2>Output</h2>
          {/* <ValueFrame outerStyle={{ flexGrow: 1, minHeight: 0, display: 'flex', alignSelf: 'stretch' }} innerStyle={{ flexGrow: 1 }}> */}
            <ToolOutputView toolOutput={output}/>
          {/* </ValueFrame> */}
          { defaultValue !== undefined &&
            <div className="xRow xGap10" style={{marginTop: 10}}>
              <input name="inline" type="checkbox" checked={useDefault} onChange={(ev) => setUseDefault(ev.target.checked)}/>
              <label htmlFor="inline">Use default value</label>
            </div>
          }
        </div>
      </div>
    </div>
  );
});


interface SplitProps {
  left: ReactNode;
  right: ReactNode;
}

const Split = memo(function Split({left, right}: SplitProps) {
  const [widthR, setWidthR] = useState(300);

  const onMouseDownResize = useCallback((ev: ReactMouseEvent) => {
    const initWidthR = widthR;
    const {clientX: initClientX} = ev;
    const moveListener = (ev: MouseEvent) => {
      const {clientX} = ev;
      setWidthR(initWidthR - clientX + initClientX);
      ev.preventDefault();
    };
    const upListener = () => {
      window.removeEventListener('mousemove', moveListener);
      window.removeEventListener('mouseup', upListener);
    }
    window.addEventListener('mousemove', moveListener);
    window.addEventListener('mouseup', upListener);
    ev.stopPropagation();
  }, [widthR]);

  return (
    <div
      className="Split"
      style={{
        display: 'flex', flexDirection: 'row',
        position: 'absolute', top: 0, left: 0, bottom: 0, right: 0,
        width: '100vw',
      }}
    >
      <div className="Split-left" style={{flexGrow: 1}}>
        {left}
      </div>
      <div className="Split-resize" style={{background: '#eaeff5', width: 4, cursor: 'ew-resize'}} onMouseDown={onMouseDownResize}>

      </div>
      <div className="Split-right" style={{background: '#eaeff5', width: widthR, flexShrink: 0}}>
        {right}
      </div>
    </div>
  );
})


//////////////////
// Dependencies //
//////////////////

export { default as React } from 'react';
export { default as ReactDOM } from 'react-dom';
export { slotSetTo } from 'src/builtin-tools/slot';
////////////////
// Re-exports //
////////////////
export { hasError, hasValue } from 'src/tools-framework/tools';
export type { ToolOutput, ToolProgram } from 'src/tools-framework/tools';
export { ToolWithView } from 'src/tools-framework/ToolWithView';
export { useTool } from 'src/tools-framework/useSubTool';
export { ToolOutputView } from "./view/Value";




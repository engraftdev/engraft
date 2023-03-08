import { useDedupe } from '@engraft/original/src/util/useDedupe';
import { RootStyles } from '@engraft/original/src/view/IsolateStyles';
import { ToolOutputView, Value } from '@engraft/original/src/view/Value';
import { VarDefinition } from '@engraft/original/src/view/Vars';
import { EngraftPromise, runTool, ShowView, slotWithCode, ToolOutput, ToolProgram, ToolView, useIncr, usePromiseState, VarBinding } from '@engraft/toolkit';
import _ from 'lodash';
import React, { memo, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DOM } from './DOM';
import css from './index.css?inline';

export interface UseEngraftProps {
  defaultValue: any;
  hide?: boolean;
  program?: ToolProgram;
}

export function useEngraft(variables: object = {}, props: UseEngraftProps) {
  const {hide, defaultValue} = props;
  const show = !hide;

  // * Manage the replacement *

  // This is only set once
  const [origContainer] = useState<HTMLElement>(() => {
    // TODO: we assume #root? why not use body?
    return document.getElementById('root')!;
  });

  const newContainer = useMemo(() => document.createElement('div'), []);
  const newRoot = useMemo(() => createRoot(newContainer), [newContainer]);

  useEffect(() => {
    if (show && origContainer) {
      origContainer.replaceWith(newContainer);
      return () => newContainer.replaceWith(origContainer);
    }
  }, [newContainer, origContainer, show])


  // * Manage the tool *

  const stableVariables = useDedupe(variables, _.isEqual);

  const varBindings = useMemo(() => {
    let varBindings: {[id: string]: VarBinding} = {};
    Object.entries(stableVariables).forEach(([name, value]) => {
      const id = `ID${name}000000`;
      varBindings[id] = {var_: {id, label: name}, outputP: EngraftPromise.resolve({value: value})};
    });
    return varBindings;
  }, [stableVariables]);

  const [program, updateProgram] = useState<ToolProgram>(
    props.program || programFromLocalStorage(useEngraftDemoKey) || slotWithCode(defaultCodeFromVariables(variables))
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(useEngraftDemoKey, JSON.stringify(program));
    } catch (e) {
      console.warn("error saving to local storage", e);
    }
  }, [program])


  const {outputP, view} = useIncr(runTool, { program, varBindings });
  const outputState = usePromiseState(outputP);

  const [useDefault, setUseDefault] = useState(show);
  useEffect(() => {
    if (show) {
      setUseDefault(true);
    }
  }, [show])

  useEffect(() => {
    newRoot.render(<>
      {show &&
        <Split
          left={
            <DOM element={origContainer}/>
          }
          right={
            <UseEngraftRHS
              variables={stableVariables}
              defaultValue={defaultValue}
              outputP={outputP}
              view={view}
              updateProgram={updateProgram}
              useDefault={useDefault}
              setUseDefault={setUseDefault}
            />
          }
        />
      }
    </>);
  }, [defaultValue, varBindings, newRoot, origContainer, stableVariables, useDefault, view, outputP, show]);

  if (useDefault || outputState.status !== 'fulfilled') {
    return defaultValue;
  }

  return outputState.value.value;
}

const useEngraftDemoKey = 'use-engraft-demo';

function programFromLocalStorage(key: string) {
  const programJson = window.localStorage.getItem(key)
  if (programJson) {
    return JSON.parse(programJson);
  } else {
    return undefined;
  }
}

interface UseEngraftRHSProps {
  variables: {[name: string]: any};
  defaultValue: any;
  outputP: EngraftPromise<ToolOutput>;
  view: ToolView<ToolProgram>;
  updateProgram: (f: (old: ToolProgram) => ToolProgram) => void;
  useDefault: boolean;
  setUseDefault: (b: boolean) => void;
}

const UseEngraftRHS = memo(function UseEngraftRHS(props: UseEngraftRHSProps) {
  const {variables, defaultValue, view, outputP, updateProgram, useDefault, setUseDefault} = props;
  return (
    <div style={{overflow: 'scroll', height: '100%'}}>
      <div className="UseEngraftEditor">
        <style type="text/css">{css}</style>
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
          <ShowView view={view} updateProgram={updateProgram}/>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', minHeight: 0}}>
          <h2>Output</h2>
          {/* <ValueFrame outerStyle={{ flexGrow: 1, minHeight: 0, display: 'flex', alignSelf: 'stretch' }} innerStyle={{ flexGrow: 1 }}> */}
            <ToolOutputView outputP={outputP} />
          {/* </ValueFrame> */}
          { defaultValue !== undefined &&
            <div className="xRow xGap10" style={{marginTop: 10}}>
              <input name="inline" type="checkbox" checked={useDefault} onChange={(ev) => setUseDefault(ev.target.checked)}/>
              <label htmlFor="inline">Paused (use default value)</label>
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

  const onMouseDownResize = useCallback((ev: React.MouseEvent) => {
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

function defaultCodeFromVariables(variables: {[name: string]: any}) {
  const names = Object.keys(variables);
  const firstName: string | undefined = names[0];
  if (firstName) {
    return `ID${firstName}000000`;
  } else {
    return '';
  }
}

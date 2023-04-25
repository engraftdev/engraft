import { registerAllTheTools } from '@engraft/all-the-tools';
import { ErrorBoundary } from '@engraft/original/lib/util/ErrorBoundary.js';
import { ObservableInspector } from '@engraft/original/lib/util/ObservableInspector.js';
import IsolateStyles from '@engraft/original/lib/view/IsolateStyles.js';
import { ToolWithView } from '@engraft/original/lib/view/ToolWithView.js';
import { ToolOutputBuffer } from '@engraft/original/lib/view/Value.js';
import { isObject } from '@engraft/shared/lib/isObject.js';
import { EngraftPromise, PromiseState, slotWithCode, ToolOutput, ToolProgram, VarBinding } from '@engraft/toolkit';
import React, { isValidElement, memo, useCallback, useEffect, useMemo, useState } from 'react';

// React exports for Observable to use
export * as ReactDOM from 'react-dom';
export { React };

registerAllTheTools();

type ObservableEmbedProps = {
  localStorageKey: string,
  reportOutputState?: (outputState: PromiseState<ToolOutput>) => void,
  reportOutputP?: (outputState: EngraftPromise<ToolOutput>) => void,
  inputs: {[name: string]: any} | undefined,
  hide?: boolean,
}

export const ObservableEmbed = memo(function ObservableEmbed(props: ObservableEmbedProps) {
  const { localStorageKey, inputs = {}, reportOutputState, reportOutputP, hide = false } = props;

  // turn inputs provided from Observable into varBindings
  const varBindings = useMemo(() => {
    let varBindings: {[id: string]: VarBinding} = {};
    Object.entries(inputs || {}).forEach(([name, value]) => {
      const id = `ID${name}000000`;
      varBindings[id] = {var_: {id, label: name}, outputP: EngraftPromise.resolve({value: value})};
    });
    return varBindings;
  }, [inputs]);

  const [program, updateProgram] = useState<ToolProgram>(
    programFromLocalStorage(localStorageKey) || slotWithCode(defaultCodeFromInputs(inputs))
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(localStorageKey, JSON.stringify(program));
    } catch (e) {
      console.warn("error saving to local storage", e);
    }
  }, [program, localStorageKey])

  const [outputP, setOutputP] = useState<EngraftPromise<ToolOutput>>(EngraftPromise.resolve({value: undefined}));

  const myReportOutputP = useCallback((outputP: EngraftPromise<ToolOutput>) => {
    // Report it to the parent
    reportOutputP && reportOutputP(outputP);
    // Save it to state, so we can display it
    setOutputP(outputP);
  }, [reportOutputP]);

  return (
    <div>
      <ToolOutputBuffer
        outputP={outputP}
        renderValue={(value) => {
          // TODO: copied from elsewhere
          let maybeElement = value as object | null | undefined;
          if (isObject(maybeElement) && isValidElement(maybeElement)) {
            return <ErrorBoundary>{maybeElement}</ErrorBoundary>;
          }
          return <ObservableInspector value={value}/>;
        }}
      />
      { !hide &&
        <div style={{marginTop: 10}}>
          <IsolateStyles>
            <ToolWithView
              program={program}
              varBindings={varBindings}
              updateProgram={updateProgram}
              reportOutputP={myReportOutputP}
              reportOutputState={reportOutputState}
            />
          </IsolateStyles>
        </div>
      }
    </div>
  );
});

// TODO: useEngraft does this too
function defaultCodeFromInputs(inputs: {[name: string]: any}) {
  const names = Object.keys(inputs);
  const firstName: string | undefined = names[0];
  if (firstName) {
    return `ID${firstName}000000`;
  } else {
    return '';
  }
}

function programFromLocalStorage(key: string) {
  const programJson = window.localStorage.getItem(key)
  if (programJson) {
    return JSON.parse(programJson);
  } else {
    return undefined;
  }
}

type ObservableExtEmbedProps = {
  reportOutputState?: (outputState: PromiseState<ToolOutput>) => void,
  reportOutputP?: (outputState: EngraftPromise<ToolOutput>) => void,
  inputs: {[name: string]: any} | undefined,
  programString: ToolProgram,
  order: number,
  hide?: boolean
}

export const ObservableExtEmbed = memo(function ObservableExtEmbed(props: ObservableExtEmbedProps) {
  const {inputs = {}, reportOutputState, reportOutputP, programString, order, hide = false} = props;

  // turn inputs provided from Observable into varBindings
  const varBindings = useMemo(() => {
    let varBindings: {[id: string]: VarBinding} = {};
    Object.entries(inputs || {}).forEach(([name, value]) => {
      const id = `ID${name}000000`;
      varBindings[id] = {var_: {id, label: name}, outputP: EngraftPromise.resolve({value: value})};
    });
    return varBindings;
  }, [inputs]);

  const [program, updateProgram] = useState<ToolProgram>(
      programString || slotWithCode(defaultCodeFromInputs(inputs))
  );


  // Engraft GUI change -> local program changes -> [Extension] -> programString changes
  useEffect(() => {
    try {
      // definitely needs debouncing
      window.parent.postMessage({source: 'observable-writer', type: 'engraft-update', order: order, program: program}, "*")
    } catch (e) {
      console.warn("error writing program string to cell", e);
    }
  }, [program])

  // manual program string change -> local program changes -> Engraft GUI changes
  useEffect(() => {
    try {
      // definitely needs debouncing
      programString && updateProgram(programString)
    } catch (e) {
      console.warn("error writing program string to cell", e);
    }
  }, [programString])


  const [outputP, setOutputP] = useState<EngraftPromise<ToolOutput>>(EngraftPromise.resolve({value: undefined}));

  const myReportOutputP = useCallback((outputP: EngraftPromise<ToolOutput>) => {
    // Report it to the parent
    reportOutputP && reportOutputP(outputP);
    // Save it to state, so we can display it
    setOutputP(outputP);
  }, [reportOutputP]);

  return (
      <div>
        <ToolOutputBuffer
            outputP={outputP}
            renderValue={(value) => {
              // TODO: copied from elsewhere
              let maybeElement = value as object | null | undefined;
              if (isObject(maybeElement) && isValidElement(maybeElement)) {
                return <ErrorBoundary>{maybeElement}</ErrorBoundary>;
              }
              return <ObservableInspector value={value}/>;
            }}
        />
        { !hide &&
            <div style={{marginTop: 10}}>
              <IsolateStyles>
                <ToolWithView
                    program={program}
                    varBindings={varBindings}
                    updateProgram={updateProgram}
                    reportOutputP={myReportOutputP}
                    reportOutputState={reportOutputState}
                />
              </IsolateStyles>
            </div>
        }
      </div>
  );
});




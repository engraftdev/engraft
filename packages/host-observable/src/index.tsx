import { registerAllTheTools } from '@engraft/all-the-tools';
import { ErrorBoundary } from '@engraft/shared/lib/ErrorBoundary.js';
import {IsolateStyles, ToolWithView, ToolOutputBuffer, EngraftPromise, PromiseState, slotWithCode, ToolOutput, ToolProgram, VarBinding} from '@engraft/hostkit';
import { isObject } from '@engraft/shared/lib/isObject.js';
import { ObservableInspector } from './ObservableInspector.js'

import React, { isValidElement, memo, useCallback, useEffect, useMemo, useState } from 'react';

// React exports for Observable to use
export * as ReactDOM from 'react-dom';
export { React };

registerAllTheTools();

type ObservableParameters = {
  inputs: {[name: string]: any} | undefined,
  programString: ToolProgram,
  ext: boolean
  hide?: boolean
}

type ObservableEmbedProps = {
  reportOutputState?: (outputState: PromiseState<ToolOutput>) => void,
  reportOutputP?: (outputState: EngraftPromise<ToolOutput>) => void,
  parameters?: ObservableParameters,
  order: number,
}

export const ObservableEmbed = memo(function ObservableEmbed(props: ObservableEmbedProps) {
  const {parameters, reportOutputState, reportOutputP, order} = props;

  // turn inputs provided from Observable into varBindings
  const varBindings = useMemo(() => {
    let varBindings: {[id: string]: VarBinding} = {};
    Object.entries(parameters?.inputs || {}).forEach(([name, value]) => {
      const id = `ID${name}000000`;
      varBindings[id] = {var_: {id, label: name}, outputP: EngraftPromise.resolve({value: value})};
    });
    return varBindings;
  }, [parameters?.inputs]);

  const [program, updateProgram] = useState<ToolProgram>(
      parameters?.programString || slotWithCode(defaultCodeFromInputs(parameters?.inputs||{}))
  );


  // Engraft GUI change -> local program changes -> [Extension] -> programString changes
  useEffect(() => {
    try {
      // definitely needs debouncing
      window.parent.postMessage({source: 'observable-writer', type: 'engraft-update', order: order, program: program}, "*")
    } catch (e) {
      console.warn("error writing program string to cell", e);
    }
  }, [order, program])

  // manual program string change -> local program changes -> Engraft GUI changes
  useEffect(() => {
    try {
      // definitely needs debouncing
      parameters?.programString && updateProgram(parameters?.programString)
    } catch (e) {
      console.warn("error writing program string to cell", e);
    }
  }, [parameters?.programString])


  const [outputP, setOutputP] = useState<EngraftPromise<ToolOutput>>(EngraftPromise.resolve({value: undefined}));

  const myReportOutputP = useCallback((outputP: EngraftPromise<ToolOutput>) => {
    // Report it to the parent
    reportOutputP && reportOutputP(outputP);
    // Save it to state, so we can display it
    setOutputP(outputP);
  }, [reportOutputP]);

  return (

      <div>
        <div style={{backgroundColor:'lightgray'}}>
          {
            (parameters?.ext) ?
                <div>Extension Active</div>
                :
                <div>No Extension</div>
          }
          <div style={{backgroundColor:'lightpink'}}>
            {JSON.stringify(parameters)}
          </div>
        </div>
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
        { !parameters?.hide &&
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
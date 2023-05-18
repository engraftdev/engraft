import { registerAllTheTools } from '@engraft/all-the-tools';
import { ErrorBoundary } from '@engraft/shared/lib/ErrorBoundary.js';
import {IsolateStyles, ToolWithView, ToolOutputBuffer, EngraftPromise, PromiseState, slotWithCode, ToolOutput, ToolProgram, VarBinding} from '@engraft/hostkit';
import { isObject } from '@engraft/shared/lib/isObject.js';
import { ObservableInspector } from './ObservableInspector.js'

import "./index.css";



import React, { isValidElement, memo, useCallback, useEffect, useMemo, useState } from 'react';
import ExtensionBanner from "./ExtensionBanner.js";

// React exports for Observable to use
export * as ReactDOM from 'react-dom';
export { React };

registerAllTheTools();

type ObservableParameters = {
  inputs: {[name: string]: any} | undefined,
  program: ToolProgram,
  ext: boolean
  hide?: boolean
}

type ObservableEmbedProps = {
  reportOutputState?: (outputState: PromiseState<ToolOutput>) => void,
  reportOutputP?: (outputState: EngraftPromise<ToolOutput>) => void,
  parameters?: ObservableParameters,
  order: number,
  extension?: boolean
  version?: number
}

export const ObservableEmbed = memo(function ObservableEmbed(props: ObservableEmbedProps) {
  const {parameters, reportOutputState, reportOutputP, order, extension = false, version = 0.1} = props;

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
      parameters?.program || slotWithCode(defaultCodeFromInputs(parameters?.inputs||{}))
  );

  const [hide, setHide] = useState<boolean>(parameters?.hide || false)
  // Engraft GUI change -> local program changes -> [Extension] -> program changes
  useEffect(() => {
    try {
      // definitely needs debouncing
      window.parent.postMessage({
        source: 'observable-writer',
        type: 'engraft-update',
        order: order,
        program: program,
      }, "*")
    } catch (e) {
      console.warn("error writing program string to cell", e);
    }
  }, [order, program])

  // manual program string change -> local program changes -> Engraft GUI changes
  useEffect(() => {
    try {
      // debouncing?
      parameters?.program && updateProgram(parameters?.program)
    } catch (e) {
      console.warn("error writing program string to cell", e);
    }
  }, [parameters?.program])


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
        <ExtensionBanner
            active={extension}
            program={program}
            version={version}
            hide={hide} setHide={setHide}
        />
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

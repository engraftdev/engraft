import { registerAllTheTools } from '@engraft/all-the-tools';
import { ErrorBoundary } from '@engraft/shared/lib/ErrorBoundary.js';
import {IsolateStyles, ToolWithView, ToolOutputBuffer, EngraftPromise, PromiseState, slotWithCode, ToolOutput, ToolProgram, VarBinding} from '@engraft/hostkit';
import { isObject } from '@engraft/shared/lib/isObject.js';
import { ObservableInspector } from './ObservableInspector.js'

import css from "./ObservableInspector.css?inline";


import React, { isValidElement, memo, useCallback, useEffect, useMemo, useState } from 'react';

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
}

export const ObservableEmbed = memo(function ObservableEmbed(props: ObservableEmbedProps) {
  const {parameters, reportOutputState, reportOutputP, order, extension = false} = props;

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


  // Engraft GUI change -> local program changes -> [Extension] -> program changes
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

  const ExtensionBanner = ({active} : {active: boolean}) => {
    if (active) {
      return (
          <div style={{width:'100%'}} id={'banner'}>
            Extension Found
          </div>
      )
    } else {
      return (
          <div style={NoExtContainerStyle}>
            <div>
              <div>Warning: Engraft Extension Not Installed!</div>
              <div>Changes are not saved, copy cell contents manually.</div>
            </div>
            <button style={ButtonStyle} onClick={()=> navigator.clipboard.writeText(JSON.stringify(program))}>
              Copy Cell
            </button>
          </div>
      )
    }
  }

  return (

      <div>
        <ExtensionBanner active={extension}/>
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




const NoExtContainerStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "rgba(255, 0, 0, 0.05)",
  color: "rgba(255, 100, 100, 0.8)",
  fontSize: "0.8em",
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "1em 1em"
};

const ButtonStyle: React.CSSProperties = {
  outline: "none",
  borderRadius: "5%",
  backgroundColor: "rgba(255, 0, 0, 0.06)",
  color: "rgba(255, 100, 100, 0.8)",
  border: "1px solid transparent",
  cursor: 'pointer'
};
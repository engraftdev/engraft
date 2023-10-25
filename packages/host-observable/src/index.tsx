import { makeBasicContext } from "@engraft/basic-setup";
import { EngraftPromise, IsolateStyles, PromiseState, ToolOutput, ToolOutputBuffer, ToolProgram, ToolWithView, VarBinding } from '@engraft/hostkit';
import { ErrorBoundary } from '@engraft/shared/lib/ErrorBoundary.js';
import { isObject } from '@engraft/shared/lib/isObject.js';
import { ObservableInspector } from './ObservableInspector.js';

import css from "./index.css?inline";

import React, { isValidElement, memo, useCallback, useEffect, useMemo, useState } from 'react';
import ExtensionBanner from "./ExtensionBanner.js";

// React exports for Observable to use
export * as ReactDOM from 'react-dom';
export { React };

export const RootStyles = memo(function RootStyles(){
  return <style>
    {css}
  </style>
})

type ObservableParameters = {
  inputs: {[name: string]: any} | undefined,
  program: ToolProgram,
}

type ObservableEmbedProps = {
  reportOutputState?: (outputState: PromiseState<ToolOutput>) => void,
  reportOutputP?: (outputState: EngraftPromise<ToolOutput>) => void,
  parameters?: ObservableParameters,
  order: number,
  extensionDetected?: boolean
  version?: number
}

export const ObservableEmbed = memo(function ObservableEmbed(props: ObservableEmbedProps) {
  const {parameters, reportOutputState, reportOutputP, order, extensionDetected = false, version = 0.1} = props;

  // turn inputs provided from Observable into varBindings
  const varBindings = useMemo(() => {
    let varBindings: {[id: string]: VarBinding} = {};
    Object.entries(parameters?.inputs || {}).forEach(([name, value]) => {
      const id = `ID${name}000000`;
      varBindings[id] = {var_: {id, label: name}, outputP: EngraftPromise.resolve({value: value})};
    });
    return varBindings;
  }, [parameters?.inputs]);

  const [context] = useState(() => makeBasicContext());

  const [program, updateProgram] = useState<ToolProgram>(
      parameters?.program || context.makeSlotWithCode(defaultCodeFromInputs(parameters?.inputs||{}))
  );

  const [editorHidden, setEditorHidden] = useState<boolean>(false)

  // Engraft GUI change -> local program changes -> [Extension] -> program changes
  useEffect(() => {
    if (order === -1) {
      return
    }

    try {
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


  const [outputP, setOutputP] = useState<EngraftPromise<ToolOutput>>(EngraftPromise.resolve({value: undefined}));

  const myReportOutputP = useCallback((outputP: EngraftPromise<ToolOutput>) => {
    // Report it to the parent
    reportOutputP && reportOutputP(outputP);
    // Save it to state, so we can display it
    setOutputP(outputP);
  }, [reportOutputP]);

  return (
    <div>
      <RootStyles/>
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
      { !editorHidden &&
          <div style={{marginTop: 10}}>
            <IsolateStyles>
              <ToolWithView
                  program={program}
                  varBindings={varBindings}
                  updateProgram={updateProgram}
                  reportOutputP={myReportOutputP}
                  reportOutputState={reportOutputState}
                  context={context}
              />
            </IsolateStyles>
          </div>
      }
      <ExtensionBanner
          extensionDetected={extensionDetected}
          program={program}
          version={version}
          editorHidden={editorHidden} setEditorHidden={setEditorHidden}
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

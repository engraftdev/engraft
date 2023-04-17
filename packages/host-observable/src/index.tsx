import { ObservableInspector } from '@engraft/original/lib/util/ObservableInspector.js';
import IsolateStyles from '@engraft/original/lib/view/IsolateStyles.js';
import { ToolOutputBuffer } from '@engraft/original/lib/view/Value.js';
import { ErrorBoundary } from '@engraft/original/lib/util/ErrorBoundary.js';
import { isObject } from '@engraft/shared/lib/isObject.js';
import { EngraftPromise, PromiseState, runTool, ShowView, slotWithCode, ToolOutput, ToolProgram, usePromiseState, useRefunction, VarBinding } from '@engraft/toolkit';
import { isValidElement, memo, useEffect, useMemo, useState } from 'react';
import React from 'react';
import { registerAllTheTools } from '@engraft/all-the-tools';

// React exports for Observable to use
export { React };
export * as ReactDOM from 'react-dom';

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

  const {outputP, view} = useRefunction(runTool, { program, varBindings });

  useEffect(() => {
    reportOutputP && reportOutputP(outputP);
  }, [outputP, reportOutputP]);

  const outputState = usePromiseState(outputP);
  useEffect(() => {
    reportOutputState && reportOutputState(outputState);
  }, [outputState, reportOutputState]);

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
            <ShowView view={view} updateProgram={updateProgram} autoFocus={true} />
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

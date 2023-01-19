import { Fragment, memo, useEffect, useMemo, useReducer, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import appCss from './App.css';
import { slotSetTo } from './builtin-tools-disabled/slot';
import { builtinTools } from "./builtinTools";
import { examples } from './examples/examples';
import { registerTool, ToolOutput, ToolProgram, VarBinding } from './tools-framework/tools';
import { ToolWithView } from './tools-framework/ToolWithView';
import range from './util/range';
import { useStateSetOnly, useStateUpdateOnly } from './util/state';
import IsolateStyles from './view/IsolateStyles';
import { ToolOutputView } from './view/Value';
import { ValueEditable } from './view/ValueEditable';



builtinTools.map(registerTool);

/*
TODO: fix remounting text-editor bug
*/

const localStorageKey = 'live-compose-v1';

const defaultProgram = {
  toolName: 'hello-world',
};

function varBindingsObject(varBindings: VarBinding[]) {
  return Object.fromEntries(varBindings.map((varBinding) => [varBinding.var_.id, varBinding]));
}

const App = memo(function App({safeMode = false}: {safeMode?: boolean}) {
  useEffect(() => {
    document.title = "Engraft";
  }, []);

  const [version, incrementVersion] = useReducer((version) => version + 1, 0);

  const [program, updateProgram] = useStateUpdateOnly<ToolProgram>(defaultProgram);
  const [programIsFromLocalStorage, setIsProgramFromLocalStorage] = useState(false);

  const varBindings = useMemo(() => varBindingsObject([
    // TODO: kinda weird we need funny IDs here, since editor regex only recognizes these
    {var_: {id: 'IDarray000000', label: 'array'}, output: {value: [1, 2, 3]}},
    {var_: {id: 'IDrange000000', label: 'range'}, output: {value: range}},
  ]), []);

  useEffect(() => {
    const programJson = window.localStorage.getItem(localStorageKey)
    if (programJson) {
      updateProgram(() => JSON.parse(programJson));
      setIsProgramFromLocalStorage(true);
    }
  }, [updateProgram])

  useEffect(() => {
    try {
      if (program !== defaultProgram) {
        window.localStorage.setItem(localStorageKey, JSON.stringify(program));
      }
    } catch (e) {
      console.warn("error saving to local storage", e);
    }
  }, [program])

  const [output, setOutput] = useStateSetOnly<ToolOutput | null>(null);
  const [copyPasteMessage, setCopyPasteMessage] = useStateSetOnly('');
  const [showTool, setShowTool] = useStateSetOnly(true);
  const [showOutput, setShowOutput] = useStateSetOnly(false);

  return <Fragment key={version}>
    <style>
      {appCss}
    </style>
    { safeMode
      ? <div>
          <IsolateStyles>
            <ValueEditable value={program} updater={updateProgram}/>
          </IsolateStyles>
        </div>
      : <div style={{...!showTool && {display: 'none'}, width: 'fit-content'}}>
          <ErrorBoundary
            fallbackRender={(props) => {
              return <div>
                <h1>error!</h1>
                <pre>{props.error.message}</pre>
                <pre>{props.error.stack}</pre>
              </div>
            }}
            resetKeys={[program]}
          >
            <ToolWithView key={`${programIsFromLocalStorage}`} program={program} updateProgram={updateProgram} varBindings={varBindings} reportOutput={setOutput} autoFocus={true}/>
          </ErrorBoundary>
        </div>
    }
    <br/>
    <br/>
    {showOutput && <ToolOutputView toolOutput={output} />}
    <br/>
    <br/>
    <br/>
    <br/>
    <br/>
    <br/>
    <div className="bottom-stuff">
      <button className="button-add" onClick={async () => {
        try {
          await navigator.clipboard.writeText(JSON.stringify(program, null, 2));
          setCopyPasteMessage('Copied successfully');
        } catch (e) {
          setCopyPasteMessage('Copy unsuccessful' + (e instanceof Error ? ': ' + e.message : ''));
        }
      }}>Copy to clipboard</button>
      {' '}
      <button className="button-add" onClick={async () => {
        try {
          const text = await navigator.clipboard.readText();
          updateProgram(() => JSON.parse(text));
          setCopyPasteMessage('Pasted successfully');
        } catch (e) {
          setCopyPasteMessage('Paste unsuccessful' + (e instanceof Error ? ': ' + e.message : ''));
        }
      }}>Paste from clipboard</button>
      {' '}
      {copyPasteMessage}
    </div>
    <br/>
    <div>
      {/* HACK: {...defaultProgram} is to distinguish it from defaultProgram, so it gets saved */}
      <button onClick={() => updateProgram(() => ({...defaultProgram}))}>Clear</button>
      {' '}
      <select value='none' onChange={(ev) => {
          incrementVersion();
          updateProgram(() => examples.find((ex) => ex.name === ev.target.value)!.program);
        }}>
        <option value='none' disabled={true}>Load example...</option>
        {examples.map(({name, program}) =>
          <option key={name} value={name}>{name}</option>
        )}
      </select>
    </div>
    <br/>
    <div>
      <button onClick={incrementVersion}>Redraw</button>
    </div>
    <br/>
    <div>
      <input type='checkbox' checked={showTool} onChange={(ev) => setShowTool(ev.target.checked)}/>
      <label>Show tool</label>
    </div>
    <div>
      <input type='checkbox' checked={showOutput} onChange={(ev) => setShowOutput(ev.target.checked)}/>
      <label>Show output</label>
    </div>
  </Fragment>
});

export default App;

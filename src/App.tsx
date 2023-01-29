import { Fragment, memo, useEffect, useMemo, useReducer } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import appCss from './App.css';
import { slotSetTo } from './builtin-tools/slot';
import { builtinTools } from "./builtinTools";
import { getFullToolIndex, lookUpTool, registerTool, ToolProgram, VarBinding } from './engraft';
import { EngraftPromise } from './engraft/EngraftPromise';
import { usePromiseState } from './engraft/EngraftPromise.react';
import { runTool } from './engraft/hooks';
import { ShowView } from './engraft/ShowView';
import { examples } from './examples/examples';
import { useIncr } from './incr/react';
import { Updater } from './util/immutable';
import { useStateSetOnly, useStateUpdateOnly } from './util/immutable-react';
import range from './util/range';
import IsolateStyles from './view/IsolateStyles';
import { ToolOutputView } from './view/Value';
import { ValueEditable } from './view/ValueEditable';

builtinTools.map(registerTool);

const localStorageKey = 'live-compose-v1';

const defaultProgram = lookUpTool('slot')!.programFactory();

function varBindingsObject(varBindings: VarBinding[]) {
  return Object.fromEntries(varBindings.map((varBinding) => [varBinding.var_.id, varBinding]));
}

const App = memo(function App({safeMode = false}: {safeMode?: boolean}) {
  useEffect(() => {
    document.title = "Engraft";
  }, []);

  const [version, incrementVersion] = useReducer((version) => version + 1, 0);

  const [program, updateProgram] = useStateUpdateOnly<ToolProgram>(() => {
    try {
      const programJson = window.localStorage.getItem(localStorageKey)
      if (programJson) {
        return JSON.parse(programJson);
      }
    } catch {}
    return defaultProgram;
  });

  useEffect(() => {
    try {
      if (program !== null) {
        window.localStorage.setItem(localStorageKey, JSON.stringify(program));
      }
    } catch (e) {
      console.warn("error saving to local storage", e);
    }
  }, [program])

  const [copyPasteMessage, setCopyPasteMessage] = useStateSetOnly(() => '');

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
      : <AppWithRunningProgram
          program={program}
          updateProgram={updateProgram as Updater<ToolProgram>}
        />
    }
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
      <button onClick={() => updateProgram(() => defaultProgram)}>Clear</button>
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
      {' '}
      <select value='none' onChange={(ev) => {
          incrementVersion();
          updateProgram(() => slotSetTo(lookUpTool(ev.target.value).programFactory()));
        }}>
        <option value='none' disabled={true}>Load tool...</option>
        {Object.keys(getFullToolIndex()).map((name) =>
          <option key={name} value={name}>{name}</option>
        )}
      </select>
    </div>
    <br/>
    <div>
      <button onClick={incrementVersion}>Redraw</button>
    </div>
  </Fragment>
});

type AppWithRunningProgramProps = {
  program: ToolProgram,
  updateProgram: Updater<ToolProgram>,
}

const AppWithRunningProgram = memo(function AppWithRunningProgram(props: AppWithRunningProgramProps) {
  const {program, updateProgram} = props;

  const varBindings = useMemo(() => varBindingsObject([
    // TODO: kinda weird we need funny IDs here, since editor regex only recognizes these
    {var_: {id: 'IDarray000000', label: 'array'}, outputP: EngraftPromise.resolve({value: [1, 2, 3]})},
    {var_: {id: 'IDrange000000', label: 'range'}, outputP: EngraftPromise.resolve({value: range})},
  ]), []);

  const {outputP, view} = useIncr(runTool, { program, varBindings, updateProgram });
  const outputState = usePromiseState(outputP);

  const [showTool, setShowTool] = useStateSetOnly(() => true);
  const [showOutput, setShowOutput] = useStateSetOnly(() => false);

  return <>
    <div style={{...!showTool && {display: 'none'}, width: 'fit-content'}}>
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
        <IsolateStyles>
          <ShowView view={view} autoFocus={true} />
        </IsolateStyles>
      </ErrorBoundary>
    </div>
    <br/>
    <br/>
    {showOutput && <ToolOutputView outputState={outputState} />}
    <br/>
    <br/>
    <div>
      <input type='checkbox' checked={showTool} onChange={(ev) => setShowTool(ev.target.checked)}/>
      <label>Show tool</label>
    </div>
    <div>
      <input type='checkbox' checked={showOutput} onChange={(ev) => setShowOutput(ev.target.checked)}/>
      <label>Show output</label>
    </div>
  </>;
});

export default App;

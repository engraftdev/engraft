import { registerAllTheTools } from "@engraft/all-the-tools";
import { useLocalStorage } from "@engraft/shared/lib/useLocalStorage.js";
import { Fragment, memo, useEffect, useMemo, useReducer, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import appCss from "./App.css?inline";
import { examples } from "./examples/index.js";
import { EngraftPromise, IsolateStyles, ShowView, ToolOutputView, ToolProgram, ValueEditable, VarBinding, getFullToolIndex, lookUpToolByName, runTool, slotWithProgram, useRefunction } from "@engraft/hostkit";

registerAllTheTools();

const defaultProgram = lookUpToolByName('slot').makeProgram();

function varBindingsObject(varBindings: VarBinding[]) {
  return Object.fromEntries(varBindings.map((varBinding) => [varBinding.var_.id, varBinding]));
}

const App = memo(function App({safeMode = false}: {safeMode?: boolean}) {
  useEffect(() => {
    document.title = "Engraft";
  }, []);

  const [version, incrementVersion] = useReducer((version) => version + 1, 0);

  const [program, setProgram] = useLocalStorage('engraft-2022-testbed', () => defaultProgram);
  const [darkMode, setDarkMode] = useLocalStorage('engraft-2022-testbed-darkMode', () => false);

  useEffect(() => {
    window.document.firstElementChild!.classList.toggle('darkMode', darkMode);
  }, [darkMode]);

  const [copyPasteMessage, setCopyPasteMessage] = useState('');

  return <Fragment key={version}>
    <style>
      {appCss}
    </style>
    { safeMode
      ? <div>
          <IsolateStyles>
            <ValueEditable value={program} updater={setProgram}/>
          </IsolateStyles>
        </div>
      : <AppWithRunningProgram
          program={program}
          setProgram={setProgram}
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
          setProgram(JSON.parse(text));
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
      <button onClick={() => setProgram(defaultProgram)}>Clear</button>
      {' '}
      <select value='none' onChange={(ev) => {
          incrementVersion();
          setProgram(examples.find((ex) => ex.name === ev.target.value)!.program);
        }}>
        <option value='none' disabled={true}>Load example...</option>
        {examples.map(({name, program}) =>
          <option key={name} value={name}>{name}</option>
        )}
      </select>
      {' '}
      <select value='none' onChange={(ev) => {
          incrementVersion();
          setProgram(slotWithProgram(lookUpToolByName(ev.target.value).makeProgram()));
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
    <br/>
    <div>
      <input type='checkbox' checked={darkMode} onChange={(ev) => setDarkMode(ev.target.checked)}/>
      <label>Dark mode</label>
    </div>
    <br/>
    <div style={{color: 'gray'}}>
      Commit: {import.meta.env.VITE_GIT_COMMIT_HASH?.slice(0, 8) || 'unknown'}
    </div>
  </Fragment>
});

type AppWithRunningProgramProps = {
  program: ToolProgram,
  setProgram: React.Dispatch<React.SetStateAction<ToolProgram>>,
}

const AppWithRunningProgram = memo(function AppWithRunningProgram(props: AppWithRunningProgramProps) {
  const {program, setProgram} = props;

  const varBindings = useMemo(() => varBindingsObject([
    // TODO: kinda weird we need funny IDs here, since editor regex only recognizes these
    {var_: {id: 'IDarray000000', label: 'array'}, outputP: EngraftPromise.resolve({value: [1, 2, 3]})},
  ]), []);

  const {outputP, view} = useRefunction(runTool, { program, varBindings });

  const [showTool, setShowTool] = useState(true);
  const [showOutput, setShowOutput] = useState(false);

  return <>
    <div style={{...!showTool && {display: 'none'}}}>
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
          <ShowView view={view} updateProgram={setProgram} autoFocus={true} />
        </IsolateStyles>
      </ErrorBoundary>
    </div>
    <br/>
    <br/>
    {showOutput && <ToolOutputView outputP={outputP} />}
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

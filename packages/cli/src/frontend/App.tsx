import { registerAllTheTools } from "@engraft/all-the-tools";
import { EngraftPromise, ToolOutput, ToolOutputBuffer, ToolProgram, ToolWithView, usePromiseState, slotWithProgram, lookUpToolByName } from "@engraft/hostkit";
import { Updater } from "@engraft/shared/lib/Updater.js";
import { useLocalStorage } from "@engraft/shared/lib/useLocalStorage.js";
import { Fragment, memo, useEffect, useMemo, useReducer, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { valueFromStdin, valueToStdout, varBindingsObject } from "../shared.js";
import appCss from "./App.css?inline";

registerAllTheTools();

const App = memo(function App({safeMode = false}: {safeMode?: boolean}) {
  useEffect(() => {
    document.title = "Engraft";
  }, []);

  const [version, incrementVersion] = useReducer((version) => version + 1, 0);

  const [stdin, updateStdin] = useState<string | null>(null);
  const [program, updateProgram] = useState<ToolProgram | null>(null);
  const [darkMode, setDarkMode] = useLocalStorage('engraft-2022-testbed-darkMode', () => false);
  const [jsonOnly, setJsonOnly] = useState<boolean | null>(null);

  useEffect(() => {
    if (stdin === null) {
      (async () => {
        const resp = await fetch('/api/stdin');
        const stdin = await resp.text();
        updateStdin(stdin);
      })();
    }
  }, [stdin]);

  useEffect(() => {
    if (program === null) {
      (async () => {
        const program = slotWithProgram(lookUpToolByName('notebook').programFactory('IDinput000000'));
        updateProgram(program);
      })();
    }
  }, [program]);

  useEffect(() => {
    window.document.firstElementChild!.classList.toggle('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    (async () => {
      const resp = await fetch('/api/json_only');
      const json_only = await resp.text();
      setJsonOnly(json_only === 'true');
    })();
  }, []);

  const [copyPasteMessage, setCopyPasteMessage] = useState('');

  return <Fragment key={version}>
    <style>
      {appCss}
    </style>
    { program !== null && stdin !== null && jsonOnly !== null
      ? <AppWithRunningProgram
          program={program}
          stdin={stdin}
          updateProgram={updateProgram as Updater<ToolProgram>}
          jsonOnly={jsonOnly}
        />
      : <div>Loading...</div>
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
  updateProgram: Updater<ToolProgram>,
  stdin: string,
  jsonOnly: boolean,
}

const AppWithRunningProgram = memo(function AppWithRunningProgram(props: AppWithRunningProgramProps) {
  const {program, updateProgram, stdin, jsonOnly} = props;

  const input = useMemo(() => valueFromStdin(stdin), [stdin]);

  const varBindings = useMemo(() => varBindingsObject([
    // TODO: kinda weird we need funny IDs here, since editor regex only recognizes these
    {var_: {id: 'IDinput000000', label: 'input'}, outputP: EngraftPromise.resolve({value: input})},
  ]), [input]);

  const [outputP, setOutputP] = useState<EngraftPromise<ToolOutput>>(EngraftPromise.unresolved());

  const stdoutP = useMemo(() => {
    return outputP.then(({value}) => ({value: valueToStdout(value, jsonOnly)}));
  }, [outputP, jsonOnly]);

  const stdoutState = usePromiseState(stdoutP);

  const saveProgram = async () => {
    const resp = await fetch('/api/program', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(program),
    });
    if (!resp.ok) {
      throw new Error(`Error saving program: ${resp.status} ${resp.statusText}`);
    }
  };

  const saveStdout = stdoutState.status === 'fulfilled' && (async () => {
    console.log('saving stdout', stdoutState.value.value)
    const resp = await fetch('/api/stdout', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stdoutState.value),
    });
    if (!resp.ok) {
      throw new Error(`Error saving stdout: ${resp.status} ${resp.statusText}`);
    }
  });

  return <>
    <div style={{width: 'fit-content', marginBottom: 140}}>
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
        <ToolWithView
          program={program} updateProgram={updateProgram}
          reportOutputP={setOutputP}
          varBindings={varBindings}
          autoFocus={true}
          expand={true}
        />
      </ErrorBoundary>
    </div>
    <div className="xRow xGap10">
      <button
        onClick={async () => {
          await saveProgram();
        }}
      >
        Save script
      </button>
      {saveStdout &&
        <button
          onClick={async () => {
            await saveProgram();
            await saveStdout();
            // TODO: close tab
            window.close();
          }}
        >
          Save script and return to stdout
        </button>
      }
    </div>
    <br/>
    <br/>
    <ToolOutputBuffer
      outputP={stdoutP}
      renderValue={(value) => {
        return <pre>{value}</pre>;
      }}
    />
  </>;
});

export default App;
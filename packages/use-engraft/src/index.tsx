/// <reference types="@types/wicg-file-system-access" />

import { useDedupe } from "@engraft/original/lib/util/useDedupe.js";
import { RootStyles } from "@engraft/original/lib/view/IsolateStyles.js";
import { ToolOutputView } from "@engraft/original/lib/view/Value.js";
import ShadowDOM from "@engraft/original/lib/util/ShadowDOM.js";
import { VarDefinition } from "@engraft/original/lib/view/Vars.js";
import { EngraftPromise, randomId, runTool, ShowView, slotWithCode, ToolOutput, ToolProgram, ToolView, useIncr, usePromiseState, useUpdateProxy, VarBinding, VarBindings } from "@engraft/toolkit";
import * as IDBKV from 'idb-keyval';
import _ from "lodash";
import React, { memo, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { DOM } from "./DOM.js";
import css from "./index.css?inline";

export type SavedProgram = {
  savedProgramId: string,
  program: ToolProgram,
}

export type UseEngraftProps = {
  program: SavedProgram | null,
  inputs?: Record<string, any>,
  defaultValue: any,
  edit?: boolean,
}

export function useEngraft(props: UseEngraftProps) {
  const {program, inputs, defaultValue, edit} = props;

  // * Manage the replacement *

  // This is only set once
  const [origContainer] = useState<HTMLElement>(() => {
    // TODO: we assume #root? why not use body?
    return document.getElementById('root')!;
  });

  const newContainer = useMemo(() => document.createElement('div'), []);
  const newRoot = useMemo(() => createRoot(newContainer), [newContainer]);

  useEffect(() => {
    if (edit && origContainer) {
      origContainer.replaceWith(newContainer);
      return () => newContainer.replaceWith(origContainer);
    }
  }, [newContainer, origContainer, edit])


  // * Manage the tool *

  const stableInputs = useDedupe(inputs || {}, _.isEqual);

  const varBindings = useMemo(() => {
    let varBindings: {[id: string]: VarBinding} = {};
    Object.entries(stableInputs).forEach(([name, value]) => {
      const id = `ID${name}000000`;
      varBindings[id] = {var_: {id, label: name}, outputP: EngraftPromise.resolve({value: value})};
    });
    return varBindings;
  }, [stableInputs]);

  const [draft, updateDraft] = useState<SavedProgram>(
    program || { savedProgramId: randomId(), program: slotWithCode(defaultCodeFromInputs(stableInputs)) }
  );

  const {outputP, view} = useIncr(runTool, { program: draft.program, varBindings });
  const outputState = usePromiseState(outputP);

  const [useDefault, setUseDefault] = useState(!!edit);

  useEffect(() => {
    newRoot.render(<>
      {edit &&
        <Split
          left={
            <DOM element={origContainer}/>
          }
          right={
            <UseEngraftRHS
              varBindings={varBindings}
              defaultValue={defaultValue}
              outputP={outputP}
              view={view}
              draft={draft}
              updateDraft={updateDraft}
              useDefault={useDefault}
              setUseDefault={setUseDefault}
            />
          }
        />
      }
    </>);
  }, [defaultValue, varBindings, newRoot, origContainer, useDefault, view, outputP, edit, draft]);

  if (useDefault || outputState.status !== 'fulfilled') {
    return defaultValue;
  }

  return outputState.value.value;
}

type UseEngraftRHSProps = {
  varBindings: VarBindings,
  defaultValue: any,
  outputP: EngraftPromise<ToolOutput>,
  view: ToolView<ToolProgram>,
  draft: SavedProgram,
  updateDraft: (f: (old: SavedProgram) => SavedProgram) => void,
  useDefault: boolean,
  setUseDefault: (b: boolean) => void,
}

// TODO: TODO: TODO: put the program's ID outside of the program itself, so slots don't break it

const UseEngraftRHS = memo(function UseEngraftRHS(props: UseEngraftRHSProps) {
  const { varBindings, defaultValue, view, outputP, draft, updateDraft, useDefault, setUseDefault } = props;
  const draftUP = useUpdateProxy(updateDraft);

  const id = draft.savedProgramId!;

  const [ fileHandle, setFileHandle ] = useState<FileSystemFileHandle | null>(null);
  const [ fileText, setFileText ] = useState<string | null>(null);

  useEffect(() => {
    async function act() {
      const fh = await IDBKV.get<FileSystemFileHandle>(id);
      if (fh) {
        setFileHandle(fh);
        const file = await fh.getFile();
        const text = await file.text();
        setFileText(text);
      }
    }
    act();
  }, [id]);

  const save = useCallback(async () => {
    let fileHandleForSaving: FileSystemFileHandle;
    if (fileHandle) {
      const file = await fileHandle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed !== null && !(typeof parsed === 'object' && parsed.savedProgramId === id)) {
        setFileHandle(null);
        await IDBKV.del(id);
        // TODO: UI
        throw new Error('File does not match program');
      }
      fileHandleForSaving = fileHandle;
    } else {
      const pickedFileHandles = await showOpenFilePicker({
        types: [
          {
            description: 'JSON Engraft program',
            accept: {
              'application/json': ['.json'],
            },
          },
        ],
      });
      if (pickedFileHandles.length !== 1) {
        // TODO: UI
        throw new Error('Expected exactly one file handle');
      }
      const pickedFileHandle = pickedFileHandles[0];
      const file = await pickedFileHandle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed !== null && !(typeof parsed === 'object' && parsed.savedProgramId === id)) {
        // TODO: UI
        console.log(parsed);
        throw new Error('File does not match program');
      }
      setFileHandle(pickedFileHandle);
      await IDBKV.set(id, pickedFileHandle);
      fileHandleForSaving = pickedFileHandle;
    }
    const newFileText = JSON.stringify(draft, null, 2);
    const writable = await fileHandleForSaving.createWritable();
    await writable.write(newFileText);
    await writable.close();
    setFileText(newFileText);
  }, [fileHandle, id, draft]);

  const synced = fileText === JSON.stringify(draft, null, 2);

  // useInterval(() => {
  //   if (fileHandle && !synced) {
  //     save();
  //   }
  // }, 1000);

  return (
    <div className="UseEngraftEditor">
      <style type="text/css">{css}</style>
      <RootStyles/>
      <div className="heading xRow">
        <h1>useEngraft</h1>
        <div className="xExpand"/>
        <button
          disabled={synced}
          onClick={() => {
            save();
            // navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
          }}
          style={{
            borderRadius: 5,
            ...synced
              ? {
                  border: '1px solid hsl(120, 30%, 50%)',
                  color: 'hsl(120, 30%, 50%)',
                  opacity: 0.5,
                }
              : {
                  border: '1px solid hsl(0, 100%, 60%)',
                  color: 'hsl(0, 100%, 60%)',
                }
          }}
        >
          { synced ? 'Saved' : 'Save' }
        </button>
      </div>
      <div className="content">
        <div className="card">
          <h2>Input</h2>
          {Object.values(varBindings).map(({var_, outputP}) => {
            return <div key={var_.id} className="xRow xAlignTop xGap10" style={{minHeight: 0}}>
              <VarDefinition var_={var_}/>
              <div style={{lineHeight: 1}}>=</div>
              <div style={{minWidth: 0, minHeight: 0, height: '100%', flexGrow: 1}}>
                <ToolOutputView outputP={outputP} />
              </div>
            </div>
          })}
        </div>

        <div className="card" style={{flexShrink: 0}}>
          <h2>Program</h2>
          <ShowView view={view} updateProgram={draftUP.program.$}/>
        </div>

        <div className="card" style={{minHeight: 0}}>
          <h2>Output</h2>
          {/* <ValueFrame outerStyle={{ flexGrow: 1, minHeight: 0, display: 'flex', alignSelf: 'stretch' }} innerStyle={{ flexGrow: 1 }}> */}
            <ToolOutputView outputP={outputP} />
          {/* </ValueFrame> */}
          { defaultValue !== undefined &&
            <label className="xRow xGap10 xAlignVCenter" style={{marginTop: 20}}>
              <input type="checkbox" checked={useDefault} onChange={(ev) => setUseDefault(ev.target.checked)} className="xMargin0" />
              Paused (use default value)
            </label>
          }
        </div>
      </div>
    </div>
  );
});


interface SplitProps {
  left: ReactNode;
  right: ReactNode;
}

const Split = memo(function Split({left, right}: SplitProps) {
  const [widthR, setWidthR] = useState(300);

  const onMouseDownResize = useCallback((ev: React.MouseEvent) => {
    const initWidthR = widthR;
    const {clientX: initClientX} = ev;
    const moveListener = (ev: MouseEvent) => {
      const {clientX} = ev;
      setWidthR(initWidthR - clientX + initClientX);
      ev.preventDefault();
    };
    const upListener = () => {
      window.removeEventListener('mousemove', moveListener);
      window.removeEventListener('mouseup', upListener);
    }
    window.addEventListener('mousemove', moveListener);
    window.addEventListener('mouseup', upListener);
    ev.stopPropagation();
  }, [widthR]);

  return (
    <div
      className="Split"
      style={{
        display: 'flex', flexDirection: 'row',
        position: 'absolute', top: 0, left: 0, bottom: 0, right: 0,
        width: '100vw',
      }}
    >
      <div className="Split-left" style={{flexGrow: 1, overflow: 'auto'}}>
        <ShadowDOM>
          {left}
        </ShadowDOM>
      </div>
      <div className="Split-resize" style={{background: '#eaeff5', width: 4, cursor: 'ew-resize'}} onMouseDown={onMouseDownResize}>

      </div>
      <div className="Split-right" style={{background: '#eaeff5', width: widthR, flexShrink: 0}}>
        <ShadowDOM>
          {right}
        </ShadowDOM>
      </div>
    </div>
  );
})

function defaultCodeFromInputs(inputs: Record<string, any>) {
  const names = Object.keys(inputs);
  const firstName: string | undefined = names[0];
  if (firstName) {
    return `ID${firstName}000000`;
  } else {
    return '';
  }
}
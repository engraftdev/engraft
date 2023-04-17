/// <reference path="./react-firebase-hooks.d.ts" />

import { slotWithCode } from "@engraft/core";
import { noOp } from "@engraft/original/lib/util/noOp.js";
import IsolateStyles from "@engraft/original/lib/view/IsolateStyles.js";
import { ToolWithView } from "@engraft/original/lib/view/ToolWithView.js";
import { ValueEditable } from "@engraft/original/lib/view/ValueEditable.js";
import { UpdateProxy, useUpdateProxy } from "@engraft/update-proxy-react";
import bootstrapCss from "bootstrap/dist/css/bootstrap.min.css?inline";
import { doc, updateDoc } from "firebase/firestore";
import _ from "lodash";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useParams } from "react-router-dom";
import { Patch, patchesRef } from "./db.js";
import { useDocumentDataAndUpdater } from "./useDocumentDataAndUpdater.js";
import { usePatchState } from "./usePatchState.js";
import { useUser } from "./util.js";

const myCss = `
@media (min-width: 992px) {
  .tool-wrapper {
    flex: 0 0 auto;
    min-width: 50%;
    width: fit-content;
    max-width: 100%;
  }
}
`


export function usePrevious <T>(value: T, initialValue: T): T {
  const ref = useRef(initialValue);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

export function useLogChanges(values: any) {
  const prevValues = usePrevious(values, null);
  for (const key in values) {
    if (prevValues && values[key] !== prevValues[key]) {
      console.log(`${key}: ${prevValues[key]} → ${values[key]}`);
    }
  }
}


export const EditPatch = memo(function EditPatch() {
  const params = useParams();
  const patchId = params.patchId;

  const docRefer = doc(patchesRef, patchId);
  const [patch, updatePatch] = useDocumentDataAndUpdater(docRefer);
  const error = undefined as Error | undefined;  // TODO: handle errors
  const patchUP = useUpdateProxy(updatePatch);

  const user = useUser();
  useEffect(() => {
    if (patch && (!user || patch.ownerUid !== user.uid)) {
      // redirect to main page
      window.location.href = '#/';
    }
  }, [user, patch]);

  return <>
    <style>{bootstrapCss} {myCss}</style>
    <style>

    </style>
    <div className="container mt-5">
      <div className="col-lg-6 mx-auto mb-3">
        <div className="d-flex flex-row-reverse align-items-center justify-content-between">
          <a href="#/" className="btn btn-outline-secondary btn-sm">back</a>
          <h3 className="text-secondary">graft garden</h3>
        </div>
      </div>
      { patch
        ? <EditPatchLoaded patchId={patchId} patch={patch} patchUP={patchUP} />
        : error
        ? <div className="col-lg-6 mx-auto">error: {error.message}</div>
        : <div className="col-lg-6 mx-auto">loading...</div>
      }
      <div className="col-lg-6 mx-auto mt-5">
        <small className="text-secondary">this is page {patchId}</small>
      </div>
    </div>
  </>
});

const EditPatchLoaded = memo(function EditPatchLoaded(props: {
  patchId: string | undefined,
  patch: Patch,
  patchUP: UpdateProxy<Patch>,
}) {
  const { patchId, patch, patchUP } = props;

  useEffect(() => {
    document.title = `graft garden: editing ${patch?.name || 'unnamed patch'}`;
  }, [patch?.name]);

  const onChangeName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateDoc(doc(patchesRef, patchId), {
      name: e.target.value,
    });
  }, [patchId]);

  const program = patch.toolProgram;
  const programIsEmpty = _.isEqual(program, slotWithCode(''));

  const { stateUP, varBindings } = usePatchState(patch);

  const [initialStateJSONDraft, setInitialStateJSONDraft] = useState(patch.initialStateJSON || "");

  return <>
    <div className="col-lg-6 mx-auto">
      <div className="input-group">
        <input className="form-control form-control-lg" type="text" value={patch!.name} onChange={onChangeName} placeholder="patch name"/>
        <a href={`#/view/${patchId}`} className="btn btn-primary btn-lg">view</a>
      </div>
    </div>
    <div className="tool-wrapper mx-auto mt-5">
      <ErrorBoundary
        fallbackRender={(props) => {
          return <div>
            <h1>error!</h1>
            <pre>{props.error.message}</pre>
            <pre>{props.error.stack}</pre>
            <div>
              <IsolateStyles>
                <ValueEditable value={program} updater={patchUP.toolProgram.$}/>
              </IsolateStyles>
            </div>
          </div>
        }}
        resetKeys={[program]}
      >
        <ToolWithView
          program={program} updateProgram={patchUP.toolProgram.$}
          reportOutputState={noOp}
          varBindings={varBindings}
          autoFocus={true}
          expand={true}
        />
      </ErrorBoundary>
      { programIsEmpty &&
        <span style={{paddingLeft: 10}}>↑ start here!</span>
      }
    </div>
    <div className="col-lg-6 mx-auto mt-5">
      { patch.initialStateJSON !== undefined
        ? <div className="input-group input-group-sm">
            <span className="input-group-text">state</span>
            <input
              type="text"
              className="form-control"
              value={initialStateJSONDraft}
              onChange={(e) => {
                setInitialStateJSONDraft(e.target.value);
                // TODO: change state if it parses
                try {
                  const parsed = JSON.parse(e.target.value);
                  stateUP.$set(parsed);
                  patchUP.initialStateJSON.$set(e.target.value);
                } catch {
                  // do nothing
                }
              }}
              style={{
                ...initialStateJSONDraft !== patch.initialStateJSON
                && { borderColor: '#dc3545' }
              }}
            />
            <button
              className="btn btn-outline-danger"
              onClick={() => {
                patchUP.initialStateJSON.$set(undefined);
              }}
            >
              remove
            </button>
          </div>
        : <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => {
              patchUP.initialStateJSON.$set("{}");
              setInitialStateJSONDraft("{}");
            }}
          >
            add state
          </button>
      }
    </div>
  </>;
});

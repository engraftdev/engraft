/// <reference path="./react-firebase-hooks.d.ts" />

import { IsolateStyles, ToolWithView, Value, slotWithCode, useStateUP } from "@engraft/hostkit";
import { noOp } from "@engraft/shared/lib/noOp.js";
import bootstrapCss from "bootstrap/dist/css/bootstrap.min.css?inline";
import { doc } from "firebase/firestore";
import _ from "lodash";
import { memo, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useDocumentData } from "react-firebase-hooks/firestore";
import { useParams } from "react-router-dom";
import { Patch, patchesRef } from "./db.js";
import { usePatchState } from "./usePatchState.js";

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

export const TinkerPatch = memo(function TinkerPatch() {
  const params = useParams();
  const patchId = params.patchId;

  const docRefer = doc(patchesRef, patchId);
  const [patch] = useDocumentData(docRefer);
  const error = undefined as Error | undefined;  // TODO: handle errors

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
        ? <TinkerPatchLoaded patchId={patchId} patch={patch} />
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

const TinkerPatchLoaded = memo(function TinkerPatchLoaded(props: {
  patchId: string | undefined,
  patch: Patch,
}) {
  const { patch } = props;

  useEffect(() => {
    document.title = `graft garden: editing ${patch?.name || 'unnamed patch'}`;
  }, [patch?.name]);

  const [ program, programUP ] = useStateUP(() => patch.toolProgram);

  const programIsEmpty = _.isEqual(program, slotWithCode(''));

  const { varBindings } = usePatchState(patch);

  return <>
    <div className="col-lg-6 mx-auto">
      <div className="input-group">
        <input className="form-control form-control-lg" type="text"
          value={patch!.name}
          placeholder="patch name"
          disabled/>
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
                <Value value={program}/>
              </IsolateStyles>
            </div>
          </div>
        }}
        resetKeys={[program]}
      >
        <div className="alert alert-warning" role="alert">
          This is tinker mode – edits to the program will not be saved.
        </div>
        <ToolWithView
          program={program} updateProgram={programUP.$}
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
              value={patch.initialStateJSON}
              disabled
            />
            <button
              className="btn btn-outline-danger"
              disabled
            >
              remove
            </button>
          </div>
        : <button
            className="btn btn-outline-secondary btn-sm"
            disabled
          >
            add state
          </button>
      }
    </div>
  </>;
});

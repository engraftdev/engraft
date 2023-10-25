/// <reference path="./react-firebase-hooks.d.ts" />

import { IsolateStyles, ToolWithView, UpdateProxy, ValueEditable, useUpdateProxy } from "@engraft/hostkit";
import { noOp } from "@engraft/shared/lib/noOp.js";
import bootstrapCss from "bootstrap/dist/css/bootstrap.min.css?inline";
import 'bootstrap/js/dist/dropdown';
import { Timestamp, addDoc, deleteDoc, doc } from "firebase/firestore";
import _ from "lodash";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Patch, patchesRef } from "./db.js";
import { useDocumentDataAndUpdater } from "./useDocumentDataAndUpdater.js";
import { usePatchState } from "./usePatchState.js";
import { context, useUser } from "./util.js";
import { getAuth } from "firebase/auth";

const myCss = `
@media (min-width: 992px) {
  .tool-wrapper {
    flex: 0 0 auto;
    min-width: 50%;
    width: fit-content;
    max-width: 100%;
  }
}
`;

const LinkMemo = memo(Link);

export const EditPatch = memo(function EditPatch(props: {safeMode?: boolean}) {
  const { safeMode = false } = props;

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
          <LinkMemo to="/" className="btn btn-outline-secondary btn-sm">back</LinkMemo>
          <h3 className="text-secondary">graft garden</h3>
        </div>
      </div>
      { patch
        ? <EditPatchLoaded patchId={patchId} patch={patch} patchUP={patchUP} safeMode={safeMode} />
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
  safeMode: boolean,
}) {
  const { patchId, patch, patchUP, safeMode } = props;
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `graft garden: editing ${patch?.name || 'unnamed patch'}`;
  }, [patch?.name]);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const willFocusNameInputRef = useRef<boolean | undefined>();
  if (willFocusNameInputRef.current === undefined) {
    willFocusNameInputRef.current = patch.name.startsWith("new page on");
  }
  useEffect(() => {
    if (willFocusNameInputRef.current) {
      nameInputRef.current?.focus();
    }
  }, []);

  const program = patch.toolProgram;
  const programIsEmpty = _.isEqual(program, context.makeSlotWithCode(''));

  const { stateUP, varBindings } = usePatchState(patch);

  const [initialStateJSONDraft, setInitialStateJSONDraft] = useState(patch.initialStateJSON || "");

  const onClickDuplicate = useCallback(async () => {
    const newDoc = await addDoc(patchesRef, {
      name: `${patch.name} (copy)`,
      ownerUid: getAuth().currentUser!.uid,
      createdAt: Timestamp.fromDate(new Date()),
      toolProgram: patch.toolProgram,
    });
    navigate(`/${newDoc.id}/edit`);
  }, [navigate, patch.name, patch.toolProgram]);

  const onClickDelete = useCallback(() => {
    deleteDoc(doc(patchesRef, patchId));
    navigate('/');
  }, [navigate, patchId]);

  return <>
    <div className="col-lg-6 mx-auto">
      <div className="input-group">
        <input className="form-control form-control-lg" type="text"
          value={patch!.name} onChange={(e) => patchUP.name.$set(e.target.value)}
          placeholder="patch name"
          ref={nameInputRef}/>
        <LinkMemo to='../view' className="btn btn-outline-primary btn-lg">view</LinkMemo>
        <button className="btn btn-lg btn-outline-primary dropdown-toggle" type="button" id="dotdotdot-dropdown-button" data-bs-toggle="dropdown" aria-expanded="false">
        ⋯
        </button>
        <ul className="dropdown-menu" aria-labelledby="dotdotdot-dropdown-button">
          <li><LinkMemo to='../tinker' className="dropdown-item">tinker mode</LinkMemo></li>
          { safeMode
            ? <li><LinkMemo to='../edit' className="dropdown-item">exciting mode</LinkMemo></li>
            : <li><LinkMemo to='../edit/safe' className="dropdown-item">safe mode</LinkMemo></li>
          }
          <li><hr className="dropdown-divider" /></li>
          <li><button className="dropdown-item" onClick={onClickDuplicate}>duplicate page</button></li>
          <li><hr className="dropdown-divider" /></li>
          <li><button className="dropdown-item" style={{color: '#dc3545'}} onClick={onClickDelete}>delete page</button></li>
        </ul>
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
        { safeMode
          ? <div>
              <div className="alert alert-warning" role="alert">
                This is safe mode. Edit the program below, then <LinkMemo to={`../edit`}>turn off safe mode</LinkMemo>.
              </div>
              <IsolateStyles>
                <ValueEditable value={program} updater={patchUP.toolProgram.$} expandedDepth={Infinity}/>
              </IsolateStyles>
            </div>
          : <ToolWithView
              program={program} updateProgram={patchUP.toolProgram.$}
              reportOutputState={noOp}
              varBindings={varBindings}
              autoFocus={!willFocusNameInputRef.current}
              expand={true}
              context={context}
            />
        }
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

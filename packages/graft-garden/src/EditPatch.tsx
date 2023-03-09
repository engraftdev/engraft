import { slotWithCode } from '@engraft/core';
import IsolateStyles from '@engraft/original/dist/view/IsolateStyles';
import { ToolWithView } from '@engraft/original/dist/view/ToolWithView';
import { ValueEditable } from '@engraft/original/dist/view/ValueEditable';
import bootstrapCss from 'bootstrap/dist/css/bootstrap.min.css?inline';
import { doc, updateDoc } from 'firebase/firestore';
import _ from 'lodash';
import { useUpdateProxy } from '@engraft/update-proxy-react';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { useParams } from 'react-router-dom';
import { patchesRef } from "./db";
import { useFirestoreUpdater } from './useFirestoreUpdater';



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
  const [patch, loading, error, _snapshot] = useDocumentData(docRefer);
  const updatePatch = useFirestoreUpdater(docRefer, patch);
  const patchUP = useUpdateProxy(updatePatch);

  useEffect(() => {
    document.title = `graft garden: editing ${patch?.name || 'unnamed patch'}`;
  }, [patch?.name]);

  const onChangeName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateDoc(doc(patchesRef, patchId), {
      name: e.target.value,
    });
  }, [patchId]);

  const program = patch?.toolProgram || slotWithCode('');

  const varBindings = useMemo(() => ({}), []);

  const programIsEmpty = _.isEqual(program, slotWithCode(''));

  return <>
    <style>{bootstrapCss} {myCss}</style>
    <style>

    </style>
    <div className="container mt-5">
      <div className="col-lg-6 mx-auto">
        <div className="d-flex flex-row-reverse align-items-center justify-content-between">
          <a href="#/" className="btn btn-outline-secondary btn-sm">back</a>
          <h3 className="text-secondary">graft garden</h3>
        </div>
      </div>
      { loading || !program
        ? <div className="col-lg-6 mx-auto">loading...</div>
        : error
        ? <div className="col-lg-6 mx-auto">error: {error.message}</div>
        : <>
            <div className="col-lg-6 mx-auto">
              <div className="btn-toolbar">
                <div className="btn-group">
                  <input className="form-control form-control-lg" type="text" value={patch!.name} onChange={onChangeName} placeholder="patch name"/>
                </div>
                <div className="btn-group">
                  <a href={`#/view/${patchId}`} className="btn btn-outline-primary btn-lg">view</a>
                </div>
              </div>
            </div>
            <div className="tool-wrapper mx-auto mt-5">
              <div style={{display: 'inline-block', maxWidth: '100%'}}>
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
                  <ToolWithView program={program} updateProgram={patchUP.toolProgram.$} reportOutputState={() => {}} varBindings={varBindings} autoFocus={true}/>
                </ErrorBoundary>
              </div>
              { programIsEmpty &&
                <span style={{paddingLeft: 10}}>← start here!</span>
              }
            </div>
          </>
      }
      <div className="col-lg-6 mx-auto mt-5">
        <small className="text-secondary">this is patch {patchId}</small>
      </div>
    </div>
  </>
});

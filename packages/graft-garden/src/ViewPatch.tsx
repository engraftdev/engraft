/// <reference path="./react-firebase-hooks.d.ts" />

import { runTool } from "@engraft/core";
import { useIncr } from "@engraft/incr-react";
import { ToolOutputView } from "@engraft/original/lib/view/Value.js";
import bootstrapCss from "bootstrap/dist/css/bootstrap.min.css?inline";
import { doc } from "firebase/firestore";
import { memo, useEffect } from "react";
import { useDocumentData } from "react-firebase-hooks/firestore";
import { useParams } from "react-router-dom";
import { Patch, patchesRef } from "./db.js";
import { usePatchState } from "./usePatchState.js";


export const ViewPatch = memo(function ViewPatch() {
  const params = useParams();
  const patchId = params.patchId;

  const [patch, _loading, error, _snapshot] = useDocumentData(doc(patchesRef, patchId));

  useEffect(() => {
    document.title = `${patch?.name || 'no name'}`;
  }, [patch?.name]);

  return <>
    <style>{bootstrapCss}</style>
    <div className="container" style={{ marginTop: '1rem' }}>
      { patch
        ? <ViewPatchActualView patch={patch}/>
        : error
        ? <p>error: {error.message}</p>
        : <p>loading...</p>
      }
    </div>
  </>
});

type ViewPatchActualViewProps = {
  patch: Patch,
};

const ViewPatchActualView = memo(function ViewPatchActualView(props: ViewPatchActualViewProps) {
  const { patch } = props;
  const { varBindings } = usePatchState(patch);
  const { outputP } = useIncr(runTool, { program: patch.toolProgram, varBindings });

  return <ToolOutputView outputP={outputP} displayReactElementsDirectly={true}/>;
})

import bootstrapCss from 'bootstrap/dist/css/bootstrap.min.css?inline';
import { doc } from 'firebase/firestore';
import { memo, useEffect, useMemo } from 'react';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { useParams } from "react-router-dom";
import { patchesRef } from "./db";

import { runTool, ToolProgram } from '@engraft/core';
import { useIncr } from '@engraft/incr-react';
import { ToolOutputView } from '@engraft/original/src/view/Value';


export const ViewPatch = memo(function ViewPatch() {
  const params = useParams();
  const patchId = params.patchId;

  const [patch, loading, error, _snapshot] = useDocumentData(doc(patchesRef, patchId));

  useEffect(() => {
    document.title = `${patch?.name || 'no name'}`;
  }, [patch?.name]);

  return <>
    <style>{bootstrapCss}</style>
    <div className="container" style={{ marginTop: '1rem' }}>
      { loading
        ? <p>loading...</p>
        : error
        ? <p>error: {error.message}</p>
        : <>
            <ViewPatchActualView program={patch!.toolProgram}/>
          </>
      }
    </div>
  </>
});


type ViewPatchActualViewProps = {
  program: ToolProgram,
};

const ViewPatchActualView = memo(function ViewPatchActualView(props: ViewPatchActualViewProps) {
  const { program } = props;
  const varBindings = useMemo(() => ({}), []);
  const { outputP } = useIncr(runTool, { program, varBindings });

  return <ToolOutputView outputP={outputP} displayReactElementsDirectly={true}/>;
})

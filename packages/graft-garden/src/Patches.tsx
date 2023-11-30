import { getAuth } from "firebase/auth";
import { Timestamp, addDoc, deleteDoc, doc } from "firebase/firestore";
import { memo, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Patch, patchesRef } from "./db.js";
import { context } from "./util.js";

type PatchesListProps = {
  patches: (Patch & {id: string})[];
}

export const PatchesList = memo(function PatchesList(props: PatchesListProps) {
  const { patches } = props;
  const navigate = useNavigate();

  const patchesSorted = useMemo(() => {
    return [...patches].sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())
  }, [patches]);

  const onClickAddNew = useCallback(async () => {
    const newDoc = await addDoc(patchesRef, {
      name: `new page on ${new Date().toLocaleString()}`,
      ownerUid: getAuth().currentUser!.uid,
      createdAt: Timestamp.fromDate(new Date()),
      toolProgram: context.makeSlotWithCode(''),
    });
    navigate(`/${newDoc.id}/edit`);
  }, [navigate]);

  return <table className="table">
    <tbody>
      <tr>
        <td>
          <button onClick={onClickAddNew} className="btn btn-primary btn-sm">new page</button>
        </td>
      </tr>
      {patchesSorted.map(patch => {
        const onClickDelete = () => {
          deleteDoc(doc(patchesRef, patch.id));
        };

        return <tr key={patch.id}>
          <td>
            <div className="d-flex flex-row align-items-center justify-content-between">
            {patch.name}
            <div className="btn-group btn-group-sm" role="group" aria-label="Basic example">
              <Link to={`/${patch.id}/edit`} className="btn btn-outline-primary">edit</Link>
              <Link to={`/${patch.id}/view`} className="btn btn-outline-primary">view</Link>
              <button type="button" className="btn btn-outline-danger" onClick={onClickDelete}>delete</button>
            </div>
            </div>
          </td>
        </tr>
      })}
      { patches.length === 0 && <tr>
        <td><i>no pages yet</i></td>
      </tr> }
    </tbody>
  </table>;
});

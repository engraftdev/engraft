import { getAuth } from "firebase/auth";
import { addDoc, deleteDoc, doc } from "firebase/firestore";
import { slotWithCode } from "@engraft/core";
import { memo, useCallback } from "react";
import { Patch, patchesRef } from "./db.js";

type PatchesListProps = {
  patches: (Patch & {id: string})[];
}

export const PatchesList = memo(function PatchesList(props: PatchesListProps) {
  const { patches } = props;

  const onClickAddNew = useCallback(() => {
    addDoc(patchesRef, {
      name: `new page on ${new Date().toLocaleString()}`,
      ownerUid: getAuth().currentUser!.uid,
      createdAt: new Date(),
      toolProgram: slotWithCode(''),
    })
  }, []);

  return <table className="table">
    <tbody>
      {patches.map(patch => {
        const onClickDelete = () => {
          deleteDoc(doc(patchesRef, patch.id));
        };

        return <tr key={patch.id}>
          <td>
            <div className="d-flex flex-row align-items-center justify-content-between">
            {patch.name}
            <div className="btn-group btn-group-sm" role="group" aria-label="Basic example">
              <a href={`#/edit/${patch.id}`} className="btn btn-outline-primary">edit</a>
              <a href={`#/view/${patch.id}`} className="btn btn-outline-primary">view</a>
              <button type="button" className="btn btn-outline-danger" onClick={onClickDelete}>delete</button>
            </div>
            </div>
          </td>
        </tr>
      })}
      { patches.length === 0 && <tr>
        <td><i>no patches yet</i></td>
      </tr> }
      <tr>
        <td>
          <button onClick={onClickAddNew} className="btn btn-primary btn-sm">new page</button>
        </td>
      </tr>
    </tbody>
  </table>;
});

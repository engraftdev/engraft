import { ToolProgram } from "@engraft/hostkit";
import { initializeApp } from "firebase/app";
import { collection, CollectionReference, deleteDoc, doc, getDocs, getFirestore, initializeFirestore, setDoc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBtFUvC-EUgrQeZSiXwzJG3I3TIdqHctCE",
  authDomain: "graft-5c499.firebaseapp.com",
  projectId: "graft-5c499",
  storageBucket: "graft-5c499.appspot.com",
  messagingSenderId: "185270441805",
  appId: "1:185270441805:web:fbe701779c7b76f4f08904"
};
export const app = initializeApp(firebaseConfig);
initializeFirestore(app, {
  ignoreUndefinedProperties: true,
});
export const db = getFirestore(app);
// enableMultiTabIndexedDbPersistence(db);

export const patchesRef = collection(db, "patches") as CollectionReference<Patch>;

export type Patch = {
  name: string,
  ownerUid: string,
  createdAt: Timestamp,
  toolProgram: ToolProgram,
  initialStateJSON?: string,
}



// Database migrations

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function renameCollection(oldName: string, newName: string) {
  getDocs(collection(db, oldName)).then(docSnapshots => {
    docSnapshots.forEach(docSnapshot => {
      setDoc(doc(collection(db, newName), docSnapshot.id), docSnapshot.data());
      deleteDoc(docSnapshot.ref);
    });
  });
}

// renameCollection("planters", "patches");

// IDK if this works...

// function renameField(collection: CollectionReference, oldName: string, newName: string) {
//   getDocs(collection).then(docSnapshots => {
//     docSnapshots.forEach(docSnapshot => {
//       const data = docSnapshot.data();
//       data[newName] = data[oldName];
//       delete data[oldName];
//       setDoc(docSnapshot.ref, data);
//     });
//   });
// }

// renameField(patchesRef, "toolConfig", "toolProgram");

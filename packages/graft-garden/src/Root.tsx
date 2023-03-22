/// <reference path="./react-firebase-hooks.d.ts" />

import bootstrapCss from "bootstrap/dist/css/bootstrap.min.css?inline";
import { getAuth, GoogleAuthProvider, User } from "firebase/auth";
import { query, where } from "firebase/firestore";
import { memo } from "react";
import { useCollection } from "react-firebase-hooks/firestore";
import { patchesRef } from "./db.js";
import { PatchesList } from "./Patches.js";
import StyledFirebaseAuth from "./StyledFirebaseAuth.js";
import { useUser } from "./util.js";


export const Root = memo(function App() {
  const user = useUser();

  if (!user) {
    return <LoggedOut/>
  }
  else {
    return <LoggedIn user={user}/>
  }
});


const LoggedOut = memo(function LoggedOut() {
  return (
    <div className="container mt-5">
      <div className="col-lg-6 mx-auto">
        <style>{bootstrapCss}</style>
        <h3 className="text-secondary">graft garden</h3>
        <h1>welcome</h1>
        <p>
          graft garden is a simple host for web-apps made with engraft
        </p>
        <p>
          please log in using one of the services below:
        </p>
        <div style={{display: 'inline-block'}}>
          <StyledFirebaseAuth
            uiConfig={{
              signInFlow: 'popup',
              signInSuccessUrl: '',
              signInOptions: [
                GoogleAuthProvider.PROVIDER_ID,
              ],
            }}
            firebaseAuth={getAuth()}
          />
        </div>
      </div>
    </div>
  );
});

type LoggedInProps = {
  user: User;
}

const LoggedIn = memo(function LoggedIn(props: LoggedInProps) {
  const { user } = props;
  const uid = user.uid;

  const [patches, loading, error] = useCollection(query(patchesRef, where('ownerUid', '==', uid)));


  return (
    <div className="container mt-5">
      <div className="col-lg-6 mx-auto">
        <style>{bootstrapCss}</style>
        <div className="d-flex flex-row-reverse align-items-center justify-content-between">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => {
              getAuth().signOut();
            }}
          >
            log out
          </button>
          <h3 className="text-secondary">graft garden</h3>
        </div>
        <h1>your pages</h1>
        { loading
          ? <p>loading...</p>
          : error
          ? <p>error: {error.message}</p>
          : <PatchesList patches={patches!.docs.map(patch => ({...patch.data(), id: patch.id}))}/>
        }
        <div>
          <small className="text-secondary">you are user {user.uid}</small>
        </div>
      </div>
    </div>
  );
});

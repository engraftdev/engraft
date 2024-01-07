import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { EditPatch } from "./EditPatch.js";
import { Root } from "./Root.js";
import { TinkerPatch } from "./TinkerPatch.js";
import { ViewPatch } from "./ViewPatch.js";

console.log(`Commit: ${import.meta.env.VITE_GIT_COMMIT_HASH?.slice(0, 8) || 'unknown'}`);

const root = createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Root/>}/>
        <Route path="/:patchId">
          <Route path="edit" element={<EditPatch/>}/>
          <Route path="edit/safe" element={<EditPatch safeMode/>}/>
          <Route path="view" element={<ViewPatch/>}/>
          <Route path="tinker" element={<TinkerPatch/>}/>
        </Route>
        {/* deprecated routes; redirect */}
        <Route path="/edit/:patchId" element={<Redirect to="/:patchId/edit"/>}/>
        <Route path="/edit/:patchId/safe" element={<Redirect to="/:patchId/edit/safe"/>}/>
        <Route path="/view/:patchId" element={<Redirect to="/:patchId/view"/>}/>
        <Route path="/tinker/:patchId" element={<Redirect to="/:patchId/tinker"/>}/>
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);

function Redirect({ to }: { to: string }) {
  const params = useParams();
  for (const key in params) {
    const value = params[key];
    if (!value) {
      throw new Error(`Redirect: missing param ${key}`);
    }
    to = to.replace(`:${key}`, () => value);
  }
  console.warn(`Redirecting from deprecated route: ${window.location.hash.slice(1)} -> ${to}`);
  return <Navigate to={to} replace />;
}

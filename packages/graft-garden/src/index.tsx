import { registerAllTheTools } from "@engraft/all-the-tools";
import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import { EditPatch } from "./EditPatch.js";
import { Root } from "./Root.js";
import { ViewPatch } from "./ViewPatch.js";

console.log(`Commit: ${import.meta.env.VITE_GIT_COMMIT_HASH?.slice(0, 8) || 'unknown'}`);

registerAllTheTools();

const root = createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Root/>}/>
        <Route path="/edit/:patchId" element={<EditPatch/>}/>
        <Route path="/edit/:patchId/safe" element={<EditPatch safeMode/>}/>
        <Route path="/view/:patchId" element={<ViewPatch/>}/>
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);

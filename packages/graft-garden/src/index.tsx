import { registerTool } from '@engraft/core';
import { builtinTools } from '@engraft/original/src/builtin-tools';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from "react-router-dom";
import { EditPatch } from './EditPatch';
import { Root } from './Root';
import { ViewPatch } from './ViewPatch';

console.log(`Commit: ${import.meta.env.VITE_GIT_COMMIT_HASH?.slice(0, 8) || 'unknown'}`);

builtinTools.forEach(registerTool);

const root = createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Root/>}/>
        <Route path="/edit/:patchId" element={<EditPatch/>}/>
        <Route path="/view/:patchId" element={<ViewPatch/>}/>
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);

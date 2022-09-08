import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from "react-router-dom";
import App from './App';
// import { TestSynthesizer } from './tools/SynthesizerTool/test';
// import { TestVoyager } from './tools/VoyagerTool/test';
// import TestUseLiveTool from './TestUseLiveTool';
import TestSynonyms from './TestSynonyms';
// import TestObservableEmbed from './TestObservableEmbed';
import { TestSync } from './TestSync';

const root = createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App/>}/>
        <Route path="/synonymizer" element={<TestSynonyms/>}/>
        <Route path="/sync" element={<TestSync/>}/>
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);

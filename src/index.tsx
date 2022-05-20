import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from "react-router-dom";
import App from './App';
// import TestSynthesizer from './TestSynthesizer';
// import TestVoyager from './TestVoyager';
// import TestUseLiveTool from './TestUseLiveTool';
import TestSynonyms from './TestSynonyms';
// import TestObservableEmbed from './TestObservableEmbed';

const root = createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App/>}/>
        <Route path="/synonyms" element={<TestSynonyms/>}/>
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);

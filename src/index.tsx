import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// import TestSynthesizer from './TestSynthesizer';
// import TestVoyager from './TestVoyager';
// import TestUseLiveTool from './TestUseLiveTool';
import TestSynonyms from './TestSynonyms';
// import TestObservableEmbed from './TestObservableEmbed';

const root = createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    {/* <App /> */}
    {/* <TestSynthesizer/> */}
    {/* <TestVoyager/> */}
    {/* <TestUseLiveTool/> */}
    <TestSynonyms/>
    {/* <TestObservableEmbed/> */}
  </React.StrictMode>,
);

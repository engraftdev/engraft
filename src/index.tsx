import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// import TestSynthesizer from './TestSynthesizer';
// import TestVoyager from './TestVoyager';

const root = createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <App />
    {/* <TestSynthesizer/> */}
    {/* <TestVoyager/> */}
  </React.StrictMode>,
);

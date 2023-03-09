import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from "react-router-dom";
import { App } from './App';

const root = createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App/>}/>
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);

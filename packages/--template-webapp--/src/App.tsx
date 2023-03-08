import { memo } from 'react';
import css from './App.css?inline';

export const App = memo(function App(props: {}) {
  return <div>
    <style>{css}</style>
    <h1>HEADING TODO</h1>
  </div>;
});

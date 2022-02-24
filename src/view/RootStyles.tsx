import rootCss from './root.css';
import highlightCss from './highlight.css';

export default function RootStyles() {
  return <style>
    {rootCss}
    {highlightCss}
  </style>
}
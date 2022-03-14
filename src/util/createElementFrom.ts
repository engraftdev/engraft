import { ReactElement } from "react";
import ReactDOM from "react-dom";

export function createElementFromHTML(htmlString: string) {
  var div = document.createElement('div');
  div.innerHTML = htmlString.trim();
  return div.firstChild;
}

export function createElementFromReact(element: ReactElement<unknown>, callback: (element: ChildNode | null) => void) {
  var container = document.createElement('div');
  ReactDOM.render(element, container, () => {
    callback(container.firstChild);
  });
}
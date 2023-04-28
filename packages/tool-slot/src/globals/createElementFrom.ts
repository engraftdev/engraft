import { ReactElement } from "react";
import ReactDOM from "react-dom";

export function createElementFromHTML(htmlString: string) {
  var div = document.createElement('div');
  div.innerHTML = htmlString.trim();
  return div.firstChild;
}

export function createElementFromReact(element: ReactElement<unknown>): Promise<ChildNode | null> {
  var container = document.createElement('div');
  return new Promise((resolve) => {
    // TODO: still using legacy (pre v18) React render
    ReactDOM.render(element, container, () => {
      resolve(container.firstChild);
    });
  })
}

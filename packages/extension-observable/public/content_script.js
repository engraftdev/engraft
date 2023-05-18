/* eslint-disable */

console.log("Observable Writer: content_script.js running")

const scriptElem = document.createElement('script');
scriptElem.src = chrome.runtime.getURL('injected_script.js');
scriptElem.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(scriptElem);

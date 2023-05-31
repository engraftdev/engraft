# Engraft-Observable Embedding (Extension)

This directory contains the codebase for the extension that supports Engraft within
[Observable](https://observablehq.com)

For complete documentation, please see [Observable host notebook](https://observablehq.com/@wongyuhao/engraft-embed).

### The Cell Editing Lifecycle

1. **User** initializes `engraft()` cell in Observable
2. **Engraft cell** initializes `engraft-check` message channel, listens for response from extension, and displays correct banner.
3. **User** edits Engraft cell → **Engraft cell** sends `engraft-update` to extension with latest program
4. **Extension** receives the changed cell’s `order`, updated `ToolProgram`, and grabs the previous text content in said cell.
5. **Extension** parses text content and program into AST with `esprima`, performs replacement and generates new string with `escodegen`
6. **Extension** dispatches updated changes back to cell.

### Concepts found in the extension codebase:

`engraft-update`:

Whenever a change in made in the React component, the `updateProgram` hook fires to update the program in the internal state. At the same time, this fires an `engraft-update` event to the extension, which processes changes in the ToolProgram, formats and writes it back to the relevant cell’s editor.

`engraft-check`:

A health check is sent to the extension via [MessageChannel](https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel) every time the React component is loaded, to provide correct behavior/warnings depending on whether the extension is active.

MessageChannels are used here instead of conventional `postMessage` to enable two-way communication between the Engraft cell and the extension.

`order`:

The extension knows which cell editor to target as each cell reports it’s `order` within the DOM via `engraft-update` This is key to supporting multiple distinct Engraft cells within one notebook.

`count-map`:

The extension also keeps track of how many `engraft-updates` have been fired from a specific cell. Presently, this is used to keep track of the startup state, so that we can re-run and sync up the cells on page reload. 
# Engraft

Engraft is an API that brings rich interactive tools into open-ended programming environments. Welcome!

## Getting started

The easiest way to start using Engraft is [Graft Garden](https://engraft.dev/graft-garden/), a hosted web-app where you can create and share programs.

Engraft also has a range of embeddings so that live & rich tools can be brought to where you are already working:

* [Engraft in React (useEngraft)](packages/use-engraft/)
* [Engraft at the command-line](packages/cli/)

A few other demos can be found at [engraft.dev](https://engraft.dev/).

## Building on the Engraft API

Do you want to build a tool that can be embedded inside Engraft programs? See [TODO: component dev guide].

Do you want to make your application or programming environment extensible with Engraft tools? See [TODO: host dev guide].

## Development

This section is about how to work in this repository.

### Setup

First, install external prerequisites:

1. [**node**](https://nodejs.org/): Not sure which version range is supported but for the record v19.7.0 works fine. (We recommend [nvm](https://github.com/nvm-sh/nvm) for managing node installations.)
2. [**yarn 1.x**](https://classic.yarnpkg.com/): On Mac, `brew install yarn` will take care of this.

Next, from the base of the repository, run:
1. `yarn` to install dependencies,
2. `yarn testbed:dev` to start a testbed development server (after building necessary packages).

### Codebase overview

Code is divided into separate packages located in the `packages` directory. Each will be (TODO!) hosted on the [npm registry](https://www.npmjs.com/) as `@engraft/PACKAGE-NAME`.  Here's a quick (non-exhaustive) overview:

* *Core*
  * [**core**](packages/core/): Defines the Engraft API itself and infrastructure common to all of Engraft (like `EngraftPromise`).
  * [**refunc**](packages/refunc/): Defines Refunc, Engraft's system for incremental computation.
    * [**refunc-react**](packages/refunc-react/): Helpers connecting Refunc with React.
    * [**eslint-plugin-refunc-hooks**](packages/eslint-plugin-refunc-hooks/): [ESLint](https://github.com/eslint/eslint) plugin ensuring proper use of Refunc hooks.
  * [**core-widgets**](packages/core/): A few visual elements that seem to be central to the Engraft experience, such as displaying values, var tokens, etc. Its long-term identity remains to be seen.
* *Tool development*
  * [**toolkit**](packages/toolkit/): Your one-stop shop for tool development – should be the only package most tools need to import from `@engraft`.
* *Host development*
  * [**hostkit**](packages/toolkit/): Your one-stop shop for host development – should be the only package most hosts need to import from `@engraft`.
* *Tools*
    * **tool-\***: Each of these packages defines a tool maintained by the Engraft team.
* *Hosts*
  * [**graft-garden**](packages/graft-garden/): Our iconic web-app Engraft host.
  * [**cli**](packages/cli/): For running Engraft as a process, at the command line or as a subprocess.
  * [**use-engraft**](packages/use-engraft/): A React hook for using Engraft to define computations in React web-apps.
    * [**use-engraft-demo**](packages/use-engraft-demo/) & [**use-engraft-demo-js**](packages/use-engraft-demo-js/): Illustrations of useEngraft embedded into simple React web-application codebases (in TypeScript and JavaScript, respectively).
  * [**testbed**](packages/testbed/): Testbed used in Engraft development.
* *Utilities*
  * [**shared**](packages/shared/): An assortment of utilities shared across this codebase. It should not be used outside this monorepo.
  * [**update-proxy**](packages/update-proxy/): A helper that makes it easy to perform immutable updates, used often in tools.
    * [**update-proxy-react**](packages/update-proxy-react/): Helpers connecting update-proxy with React.
  * [**codemirror-helpers**](packages/codemirror-helpers/): Extensions to CodeMirror, including `FancyCodeEditor` (which powers `slot`, `text`, `python`, etc.).
* *Provisional*
  * [**original-tools**](packages/original/): A bunch of tools that haven't been sorted into packages yet.
  * [**all-the-tools**](packages/all-the-tools/): A hard-coded assembly of all the tools the Engraft team has built, to be bundled into every Engraft host. Not the way things will work long-term.

### Build system overview

Most packages (including those defining Engraft components) are *libraries*.
In their `package.json` files, they provide `build-lib` scripts which compile TypeScript from `src` into JavaScript in `lib` (with TypeScript declaration files and various source maps).

For a package to be compiled correctly, its dependencies must be compiled, and their dependencies, and so on.
We use [Lerna](https://lerna.js.org/)/[nx](https://nx.dev/) to manage all of this automatically.
To build a library and all its n-fold dependencies, run:
```
yarn lerna run build-lib --scope @engraft/PACKAGE-NAME
```
(This is admittedly a mouthful and we may make some shortcuts.)

Some packages define *applications*.
For these, use `build-app` rather than `build-lib`.
This will call [Vite](https://vitejs.dev/) to bundle all our interdependent modules into JavaScript that can be loaded by the browser.

### Testing & other checks

We have tests (run by [Vitest](https://vitest.dev/)) and a few other ways of checking that things are working (TypeScript, ESLint, depcheck). These should all be documented more (TODO!), but for now, just run
```
yarn all:checks
```
and make sure there aren't any errors.

### Editors

Engraft has primarily been developed with VS Code, with the [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint). With this setup, TypeScript language services and inline linting feedback work nicely.

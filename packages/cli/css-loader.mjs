import { cwd } from 'node:process';
import { pathToFileURL } from 'node:url';

// see https://nodejs.org/api/esm.html#loaders

const baseURL = pathToFileURL(`${cwd()}/`).href;

const extensionsRegex = /\.css\?inline$/;

export async function resolve(specifier, context, nextResolve) {
  if (extensionsRegex.test(specifier)) {
    const { parentURL = baseURL } = context;

    // Node.js normally errors on unknown file extensions, so return a URL for
    // specifiers ending in the file extensions.
    return {
      shortCircuit: true,
      url: new URL(specifier, parentURL).href,
    };
  }

  // Let Node.js handle all other specifiers.
  return nextResolve(specifier);
}

export async function load(url, context, nextLoad) {
  if (extensionsRegex.test(url)) {
    return {
      format: 'module',
      shortCircuit: true,
      source: `export default 'style time';`,
    };
  }

  // Defer to the next hook in the chain.
  return nextLoad(url);
}

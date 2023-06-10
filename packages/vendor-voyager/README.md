# @engraft/vendor-voyager

This package vendors in a compiled, slightly patched version of [Voyager](https://github.com/vega/voyager). It is used in @engraft/tool-voyager.

(Why? The bundled version of Voyager available on npm does not expose the bits we want. We can't access unbundled bits because that exposes unbuilt pieces like Sass, and that's a mess. Hence, we need to patch. Compiling a patched version requires an older version of Node (16), so it's easier to just build it separately and then copy it in here.)

Note: This package will only install without errors if `canvas` and `canvas-prebuilt` are avoided. We do this with Yarn `resolutions` in the monorepo's root `package.json`:
```
  "resolutions": {
    "canvas": "https://registry.yarnpkg.com/@favware/skip-dependency/-/skip-dependency-1.2.1.tgz",
    "canvas-prebuilt": "https://registry.yarnpkg.com/@favware/skip-dependency/-/skip-dependency-1.2.1.tgz"
  }
```
(This doesn't work if put in this package's `package.json` because of [this issue](https://github.com/yarnpkg/yarn/issues/5039).)

Note also: For this package to compile with Vite, we need to add it to the `optimizeDeps` list in the monorepo's root `vite.config.ts`:
```
    optimizeDeps: {
      include: [
        "@engraft/vendor-voyager",
      ]
    }
```

const examplesContext = require.context('.', true, /\.\/(.*)\.json$/);

export const examples =
  examplesContext.keys().map(id => ({
    name: id.match(/\.\/(.*)\.json$/)![1],
    config: examplesContext(id)
  }));

module.exports = (api) => {
  const isTest = api.env('test');

  return {
    presets: [
      ...isTest ? [['@babel/preset-env', {targets: {node: 'current'}}]] : [],
      ['@babel/preset-react', {runtime: 'automatic'}],
      '@babel/preset-typescript',
    ],
  };
};

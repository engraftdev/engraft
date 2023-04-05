const ExhaustiveDeps = require('./ExhaustiveDeps');

module.exports = {
  configs: {
    recommended: {
      plugins: ['@engraft/refunc-hooks'],
      rules: {
        '@engraft/refunc-hooks/exhaustive-deps': 'warn',
      },
    },
  },

  rules: {
    'exhaustive-deps': ExhaustiveDeps,
  },
};

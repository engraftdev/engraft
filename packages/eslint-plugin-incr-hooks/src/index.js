const ExhaustiveDeps = require('./ExhaustiveDeps');

module.exports = {
  configs: {
    recommended: {
      plugins: ['@engraft/incr-hooks'],
      rules: {
        '@engraft/incr-hooks/exhaustive-deps': 'warn',
      },
    },
  },

  rules: {
    'exhaustive-deps': ExhaustiveDeps,
  },
};

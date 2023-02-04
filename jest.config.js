const { compilerOptions } = require('./tsconfig')

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'jsdom',
  modulePaths: [compilerOptions.baseUrl],
  setupFilesAfterEnv: ['<rootDir>/tests/setupFileAfterEnv.js'],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/tests/mockStyle.js',
  },
  transformIgnorePatterns: [
    "<rootDir>/node_modules/(?!(isoformat)/)",
  ],
  testTimeout: 1000,
};

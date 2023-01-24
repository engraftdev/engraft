const { compilerOptions } = require('./tsconfig')

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'jsdom',
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/__mocks__/styleMock.js',
  },
  transformIgnorePatterns: [
    "<rootDir>/node_modules/(?!(isoformat)/)",
  ],
  testTimeout: 1000,
};

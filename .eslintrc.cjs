/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: [
    "react-app"
  ],
  plugins: [
    "@engraft/refunc-hooks"
  ],
  settings: {
    'import/resolver': {
      typescript: true
    }
  },
  ignorePatterns: [
    "dist",
    "lib",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        args: "none",
        ignoreRestSiblings: true,
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }
    ],
    "@engraft/refunc-hooks/exhaustive-deps": "warn",
    "import/no-restricted-paths": [
      "error",
      {
        zones: [
          {
            target: "./test",
            from: "./src",
          }
        ]
      }
    ]
  }
}

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: [
    "react-app"
  ],
  plugins: [
    "@engraft/incr-hooks"
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
    "@engraft/incr-hooks/exhaustive-deps": "warn"
  }
}

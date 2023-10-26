// ambient declaration file for our css-to-js system

declare module '*.css.js' {
  const src: string
  export default src
}

declare module '*.css.cjs' {
  // TODO: this one's only for voyager; please get rid of it
  const src: string
  export default src
}

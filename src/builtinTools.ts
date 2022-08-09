import { Tool } from "src/tools-framework/tools";

// this matches "./builtin-tools/some.tsx" or "./builtin-tools/some/index.tsx"
const toolsContext = require.context('.', true, /^\.\/builtin-tools\/([^/]*)\.tsx$|^\.\/builtin-tools\/([^/]*)\/index\.tsx$/);

export const builtinTools = toolsContext.keys().map(id => (toolsContext(id) as Tool));

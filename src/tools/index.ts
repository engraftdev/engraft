import { Tool } from "src/tools-framework/tools";

// this means "SomeTool.tsx" or "SomeTool/index.tsx"
const toolsContext = require.context('.', true, /^\.\/([^/]*)Tool\.tsx$|^\.\/([^/]*)Tool\/index\.tsx$/);

export const builtinTools = toolsContext.keys().map(id => (toolsContext(id) as Tool));

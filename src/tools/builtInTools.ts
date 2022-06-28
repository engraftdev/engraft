// this means "SomeTool.tsx" or "SomeTool/index.tsx"
const toolsContext = require.context('.', true, /^\.\/([^/]*)Tool\.tsx$|^\.\/([^/]*)Tool\/index\.tsx$/);

console.log("keys",toolsContext.keys());

export const tools = toolsContext.keys().map(id => toolsContext(id));

import { toolFromModule } from "./toolFromModule";

// this matches "./builtin-tools/some.tsx" or "./builtin-tools/some/index.tsx"
const toolsContext = require.context('.', true, /^\.\/builtin-tools\/([^/]*)\.[jt]sx?$|^\.\/builtin-tools\/([^/]*)\/index\.tsx$/);

export const builtinTools = toolsContext.keys().map(id => toolFromModule(toolsContext(id)));

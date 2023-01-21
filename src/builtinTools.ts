import { toolFromModule } from "./toolFromModule";

// this matches "./builtin-tools/[something]/index.tsx"
const toolsContext = require.context('.', true, /^\.\/builtin-tools\/([^/]*)\/index\.tsx$/);

export const builtinTools = toolsContext.keys().map(id => toolFromModule(toolsContext(id)));

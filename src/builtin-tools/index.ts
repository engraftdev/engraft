import { toolFromModule } from "../engraft/toolFromModule";

// this matches "./[something]/index.tsx"
const toolsContext = require.context('.', true, /^\.\/([^/]*)\/index\.tsx$/);

export const builtinTools = toolsContext.keys().map(id => toolFromModule(toolsContext(id)));

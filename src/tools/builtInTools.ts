const toolsContext = require.context('.', true, /\.\/(.*)Tool\.tsx$/);

export const tools = toolsContext.keys().map(id => toolsContext(id));

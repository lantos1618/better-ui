// AUI Tool Examples
export { simpleTool, complexTool } from './simple-vs-complex';
export { default as databaseTool } from './database-tool';
export { default as fileUploadTool } from './file-upload-tool';
export { default as chatTool } from './chat-tool';

// Re-export from existing tools
export { default as weatherTool } from '../tools/weather-simple';
export { complexSearchTool as searchTool } from '../tools/search-complex';
import { AUITool, AUIContext } from './core';
import aui from './index';
import { z } from 'zod';

export function convertToVercelTool<TInput = any, TOutput = any>(
  auiTool: AUITool<TInput, TOutput>
): any {
  const config = auiTool.getConfig();
  
  const vercelToolDefinition = {
    description: config.description || `Execute ${config.name} tool`,
    parameters: config.inputSchema || z.any(),
    execute: async (input: any) => {
      const ctx = aui.createContext();
      return await auiTool.run(input as TInput, ctx);
    }
  };
  
  return vercelToolDefinition;
}

export function createVercelTools(tools: AUITool[]): Record<string, any> {
  const vercelTools: Record<string, any> = {};
  
  tools.forEach(tool => {
    vercelTools[tool.name] = convertToVercelTool(tool);
  });
  
  return vercelTools;
}

export function createAUIToolFromVercel<TInput = any, TOutput = any>(
  name: string,
  vercelToolDef: {
    description?: string;
    parameters: z.ZodType<TInput>;
    execute: (input: TInput) => Promise<TOutput> | TOutput;
  }
): AUITool<TInput, TOutput> {
  const tool = aui
    .tool(name)
    .input(vercelToolDef.parameters)
    .execute(async ({ input }) => vercelToolDef.execute(input));
  
  if (vercelToolDef.description) {
    tool.describe(vercelToolDef.description);
  }
  
  return tool;
}

export async function executeToolWithStreaming<TInput, TOutput>(
  tool: AUITool<TInput, TOutput>,
  input: TInput,
  onStream?: (chunk: any) => void
): Promise<TOutput> {
  const ctx = aui.createContext();
  
  if (onStream) {
    const originalFetch = ctx.fetch;
    ctx.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      if (response.body && response.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          onStream(chunk);
        }
      }
      
      return response;
    };
  }
  
  return await tool.run(input, ctx);
}

export const vercelAIIntegration = {
  convertToVercelTool,
  createVercelTools,
  createAUIToolFromVercel,
  executeToolWithStreaming,
  
  getAllVercelTools() {
    const tools = aui.getTools();
    return createVercelTools(tools);
  },
  
  registerWithVercelAI(tools: AUITool[]) {
    return createVercelTools(tools);
  }
};

export default vercelAIIntegration;
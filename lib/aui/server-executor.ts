import { AUITool, AUIContext } from './core';
import aui from './index';

export interface ServerExecutorOptions {
  // Security options
  allowedTools?: string[];
  blockedTools?: string[];
  maxExecutionTime?: number;
  
  // Context options
  defaultContext?: Partial<AUIContext>;
  
  // Logging
  logExecution?: boolean;
}

export class ServerExecutor {
  private options: ServerExecutorOptions;
  
  constructor(options: ServerExecutorOptions = {}) {
    this.options = {
      maxExecutionTime: 30000, // 30 seconds default
      logExecution: true,
      ...options
    };
  }
  
  async execute<TInput = any, TOutput = any>(
    toolName: string,
    input: TInput,
    context?: Partial<AUIContext>
  ): Promise<TOutput> {
    // Security checks
    if (this.options.blockedTools?.includes(toolName)) {
      throw new Error(`Tool "${toolName}" is blocked`);
    }
    
    if (this.options.allowedTools && !this.options.allowedTools.includes(toolName)) {
      throw new Error(`Tool "${toolName}" is not allowed`);
    }
    
    // Get the tool
    const tool = aui.get(toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found`);
    }
    
    // Create server context
    const serverContext = aui.createContext({
      isServer: true,
      ...this.options.defaultContext,
      ...context
    });
    
    // Log execution if enabled
    if (this.options.logExecution) {
      console.log(`[AUI] Executing tool: ${toolName}`, { input });
    }
    
    // Execute with timeout
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Tool execution timeout (${this.options.maxExecutionTime}ms)`));
      }, this.options.maxExecutionTime!);
    });
    
    try {
      const result = await Promise.race([
        tool.run(input, serverContext),
        timeoutPromise
      ]) as TOutput;
      
      // Clear the timeout after successful execution
      clearTimeout(timeoutId);
      
      if (this.options.logExecution) {
        console.log(`[AUI] Tool executed successfully: ${toolName}`);
      }
      
      return result;
    } catch (error) {
      // Clear the timeout on error as well
      clearTimeout(timeoutId!);
      
      if (this.options.logExecution) {
        console.error(`[AUI] Tool execution failed: ${toolName}`, error);
      }
      throw error;
    }
  }
  
  async executeBatch(
    executions: Array<{ tool: string; input: any }>
  ): Promise<Array<{ tool: string; result?: any; error?: string }>> {
    const results = await Promise.allSettled(
      executions.map(({ tool, input }) => 
        this.execute(tool, input)
      )
    );
    
    return results.map((result, index) => ({
      tool: executions[index].tool,
      ...(result.status === 'fulfilled' 
        ? { result: result.value }
        : { error: result.reason?.message || 'Unknown error' }
      )
    }));
  }
  
  // Validate tool input without executing
  async validate(toolName: string, input: any): Promise<boolean> {
    const tool = aui.get(toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found`);
    }
    
    const config = tool.getConfig();
    if (!config.inputSchema) {
      return true; // No schema means any input is valid
    }
    
    try {
      config.inputSchema.parse(input);
      return true;
    } catch {
      return false;
    }
  }
  
  // Get tool capabilities for AI
  getCapabilities(): Array<{
    name: string;
    description?: string;
    hasInput: boolean;
    hasServerExecution: boolean;
    hasClientExecution: boolean;
    tags: string[];
  }> {
    return aui.getTools().map((tool: any) => {
      const config = tool.getConfig();
      return {
        name: tool.name,
        description: tool.description,
        hasInput: !!config.inputSchema,
        hasServerExecution: !!config.executeHandler,
        hasClientExecution: !!config.clientHandler,
        tags: tool.tags
      };
    });
  }
}

// Default server executor instance
export const serverExecutor = new ServerExecutor();

// Helper function for API routes
export async function executeServerTool<TInput = any, TOutput = any>(
  toolName: string,
  input: TInput,
  options?: ServerExecutorOptions
): Promise<TOutput> {
  const executor = options ? new ServerExecutor(options) : serverExecutor;
  return executor.execute(toolName, input);
}
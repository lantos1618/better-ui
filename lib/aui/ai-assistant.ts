import { z } from 'zod';
import { AUITool, AUIContext } from './core';
import { AIControlledTool, aiControlSystem } from './ai-control';
import { clientControlSystem } from './client-control';
import { globalToolRegistry, ToolMetadata } from './tool-registry';
import { ClientExecutor } from './client-executor';

export interface AIAssistantConfig {
  name: string;
  description?: string;
  systemPrompt?: string;
  tools?: string[]; // Tool names this assistant can use
  capabilities?: {
    canExecuteServerTools?: boolean;
    canExecuteClientTools?: boolean;
    canAccessDatabase?: boolean;
    canAccessFileSystem?: boolean;
    canMakeNetworkRequests?: boolean;
  };
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface AIToolCall {
  id: string;
  tool: string;
  input: any;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: any;
  error?: Error;
  startTime?: Date;
  endTime?: Date;
}

export interface AIConversationMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: AIToolCall[];
  timestamp: Date;
}

export class AIAssistant {
  private config: AIAssistantConfig;
  private conversation: AIConversationMessage[] = [];
  private availableTools: Map<string, AUITool | AIControlledTool> = new Map();
  private executor: ClientExecutor;
  private pendingToolCalls: Map<string, AIToolCall> = new Map();

  constructor(config: AIAssistantConfig) {
    this.config = config;
    this.executor = new ClientExecutor();
    this.initializeTools();
  }

  private initializeTools(): void {
    if (this.config.tools) {
      this.config.tools.forEach(toolName => {
        const tool = globalToolRegistry.get(toolName) || 
                    aiControlSystem.get(toolName) ||
                    clientControlSystem.tools.get(toolName);
        
        if (tool) {
          this.availableTools.set(toolName, tool);
        }
      });
    }
  }

  async processMessage(message: string, context?: Partial<AUIContext>): Promise<{
    response: string;
    toolCalls?: AIToolCall[];
  }> {
    // Add user message to conversation
    this.conversation.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Parse message for tool calls
    const toolCalls = await this.extractToolCalls(message);
    
    if (toolCalls.length > 0) {
      // Execute tool calls
      const results = await this.executeToolCalls(toolCalls, context);
      
      // Generate response based on tool results
      const response = this.generateToolResponse(results);
      
      // Add assistant response to conversation
      this.conversation.push({
        role: 'assistant',
        content: response,
        toolCalls: results,
        timestamp: new Date(),
      });
      
      return { response, toolCalls: results };
    }
    
    // Generate regular response
    const response = await this.generateResponse(message);
    
    this.conversation.push({
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    });
    
    return { response };
  }

  private async extractToolCalls(message: string): Promise<AIToolCall[]> {
    const toolCalls: AIToolCall[] = [];
    
    // Simple pattern matching for tool calls
    // Format: @toolname{input}
    const pattern = /@(\w+)\{([^}]+)\}/g;
    let match;
    
    while ((match = pattern.exec(message)) !== null) {
      const [, toolName, inputStr] = match;
      
      if (this.availableTools.has(toolName)) {
        try {
          const input = JSON.parse(inputStr);
          toolCalls.push({
            id: `tc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            tool: toolName,
            input,
            status: 'pending',
          });
        } catch {
          // Invalid JSON, skip
        }
      }
    }
    
    return toolCalls;
  }

  private async executeToolCalls(
    toolCalls: AIToolCall[],
    context?: Partial<AUIContext>
  ): Promise<AIToolCall[]> {
    const results = await Promise.all(
      toolCalls.map(async (call) => {
        const tool = this.availableTools.get(call.tool);
        if (!tool) {
          return {
            ...call,
            status: 'failed' as const,
            error: new Error(`Tool ${call.tool} not available`),
          };
        }
        
        call.status = 'executing';
        call.startTime = new Date();
        this.pendingToolCalls.set(call.id, call);
        
        try {
          const result = await tool.run(call.input, {
            ...context,
            cache: context?.cache || new Map(),
            fetch: context?.fetch || fetch,
            isServer: context?.isServer ?? (typeof window === 'undefined'),
          } as AUIContext);
          
          call.status = 'completed';
          call.result = result;
          call.endTime = new Date();
        } catch (error) {
          call.status = 'failed';
          call.error = error as Error;
          call.endTime = new Date();
        }
        
        this.pendingToolCalls.delete(call.id);
        return call;
      })
    );
    
    return results;
  }

  private generateToolResponse(toolCalls: AIToolCall[]): string {
    const successful = toolCalls.filter(tc => tc.status === 'completed');
    const failed = toolCalls.filter(tc => tc.status === 'failed');
    
    let response = '';
    
    if (successful.length > 0) {
      response += `Successfully executed ${successful.length} tool(s):\n`;
      successful.forEach(tc => {
        response += `- ${tc.tool}: ${JSON.stringify(tc.result)}\n`;
      });
    }
    
    if (failed.length > 0) {
      response += `\nFailed to execute ${failed.length} tool(s):\n`;
      failed.forEach(tc => {
        response += `- ${tc.tool}: ${tc.error?.message}\n`;
      });
    }
    
    return response || 'No tools were executed.';
  }

  private async generateResponse(message: string): Promise<string> {
    // Simple response generation
    // In a real implementation, this would call an LLM API
    return `I understand you said: "${message}". How can I help you with that?`;
  }

  getAvailableTools(): ToolMetadata[] {
    return Array.from(this.availableTools.keys()).map(name => {
      const tool = this.availableTools.get(name)!;
      return globalToolRegistry.getMetadata(name) || {
        name: tool.name,
        description: tool.description,
        tags: tool.tags,
        category: 'custom',
      };
    });
  }

  getConversation(): AIConversationMessage[] {
    return [...this.conversation];
  }

  clearConversation(): void {
    this.conversation = [];
    if (this.config.systemPrompt) {
      this.conversation.push({
        role: 'system',
        content: this.config.systemPrompt,
        timestamp: new Date(),
      });
    }
  }

  addTool(toolName: string): boolean {
    const tool = globalToolRegistry.get(toolName) || 
                aiControlSystem.get(toolName) ||
                clientControlSystem.tools.get(toolName);
    
    if (tool) {
      this.availableTools.set(toolName, tool);
      if (!this.config.tools) {
        this.config.tools = [];
      }
      this.config.tools.push(toolName);
      return true;
    }
    
    return false;
  }

  removeTool(toolName: string): boolean {
    if (this.availableTools.has(toolName)) {
      this.availableTools.delete(toolName);
      if (this.config.tools) {
        this.config.tools = this.config.tools.filter(t => t !== toolName);
      }
      return true;
    }
    return false;
  }

  getPendingToolCalls(): AIToolCall[] {
    return Array.from(this.pendingToolCalls.values());
  }

  cancelToolCall(id: string): boolean {
    if (this.pendingToolCalls.has(id)) {
      const call = this.pendingToolCalls.get(id)!;
      call.status = 'failed';
      call.error = new Error('Cancelled by user');
      call.endTime = new Date();
      this.pendingToolCalls.delete(id);
      return true;
    }
    return false;
  }
}

// Helper function to create a tool-calling format for LLMs
export function formatToolForLLM(tool: AUITool | AIControlledTool): {
  name: string;
  description: string;
  parameters: any;
} {
  const metadata = globalToolRegistry.getMetadata(tool.name);
  
  return {
    name: tool.name,
    description: tool.description || metadata?.description || '',
    parameters: tool.schema ? schemaToOpenAIFormat(tool.schema) : {
      type: 'object',
      properties: {},
    },
  };
}

function schemaToOpenAIFormat(schema: z.ZodType<any>): any {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];
    
    Object.entries(shape).forEach(([key, value]: [string, any]) => {
      properties[key] = schemaToOpenAIFormat(value);
      if (!value.isOptional()) {
        required.push(key);
      }
    });
    
    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }
  
  if (schema instanceof z.ZodString) {
    return { type: 'string' };
  }
  
  if (schema instanceof z.ZodNumber) {
    return { type: 'number' };
  }
  
  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }
  
  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: schemaToOpenAIFormat(schema.element),
    };
  }
  
  if (schema instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: schema.options,
    };
  }
  
  return { type: 'string' };
}

// Pre-configured assistants
export const assistants = {
  webDeveloper: new AIAssistant({
    name: 'Web Developer Assistant',
    description: 'Helps with web development tasks',
    systemPrompt: 'You are a helpful web development assistant. You can manipulate the DOM, handle forms, manage storage, and control navigation.',
    tools: [
      'client-dom',
      'client-events',
      'client-forms',
      'client-storage',
      'client-navigation',
    ],
    capabilities: {
      canExecuteClientTools: true,
      canMakeNetworkRequests: true,
    },
  }),
  
  dataAnalyst: new AIAssistant({
    name: 'Data Analyst Assistant',
    description: 'Helps with data analysis and database operations',
    systemPrompt: 'You are a data analysis assistant. You can query databases, process data, and generate insights.',
    tools: [
      'db-control',
      'api-control',
    ],
    capabilities: {
      canExecuteServerTools: true,
      canAccessDatabase: true,
      canMakeNetworkRequests: true,
    },
  }),
  
  uiDesigner: new AIAssistant({
    name: 'UI Designer Assistant',
    description: 'Helps with UI design and animations',
    systemPrompt: 'You are a UI design assistant. You can create animations, control media, and manipulate visual elements.',
    tools: [
      'client-dom',
      'client-animation',
      'client-media',
      'ui-control',
    ],
    capabilities: {
      canExecuteClientTools: true,
    },
  }),
};

// Export a function to create custom assistants
export function createAIAssistant(config: AIAssistantConfig): AIAssistant {
  return new AIAssistant(config);
}
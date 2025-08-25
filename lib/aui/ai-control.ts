import { ReactElement } from 'react';
import { z } from 'zod';
import { AUITool, AUIContext } from './core';

export interface AIControlOptions {
  permissions?: {
    allowClientExecution?: boolean;
    allowServerExecution?: boolean;
    allowDatabaseAccess?: boolean;
    allowFileSystemAccess?: boolean;
    allowNetworkRequests?: boolean;
  };
  rateLimit?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
  };
  audit?: boolean;
  sandbox?: boolean;
}

export class AIControlledTool<TInput = any, TOutput = any> extends AUITool<TInput, TOutput> {
  private controlOptions: AIControlOptions = {};
  private executionLog: Array<{
    timestamp: Date;
    input: TInput;
    output?: TOutput;
    error?: Error;
    context?: Partial<AUIContext>;
  }> = [];

  constructor(name: string, options?: AIControlOptions) {
    super(name);
    this.controlOptions = options || {};
  }

  // Override methods to maintain correct type
  input<T>(schema: z.ZodType<T>): AIControlledTool<T, TOutput> {
    super.input(schema);
    return this as any;
  }

  execute<O>(handler: (params: { input: TInput; ctx?: AUIContext }) => O | Promise<O>): AIControlledTool<TInput, O> {
    super.execute(handler);
    return this as any;
  }

  clientExecute(handler: (params: { input: TInput; ctx: AUIContext }) => TOutput | Promise<TOutput>): this {
    super.clientExecute(handler);
    return this;
  }

  render(component: (props: { data: TOutput; input?: TInput; loading?: boolean; error?: Error }) => ReactElement): this {
    super.render(component);
    return this;
  }

  middleware(fn: (params: { input: TInput; ctx: AUIContext; next: () => Promise<TOutput> }) => Promise<TOutput>): this {
    super.middleware(fn);
    return this;
  }

  describe(description: string): this {
    super.describe(description);
    return this;
  }

  tag(...tags: string[]): this {
    super.tag(...tags);
    return this;
  }

  withPermissions(permissions: AIControlOptions['permissions']): this {
    this.controlOptions.permissions = {
      ...this.controlOptions.permissions,
      ...permissions
    };
    return this;
  }

  withRateLimit(limit: AIControlOptions['rateLimit']): this {
    this.controlOptions.rateLimit = limit;
    return this;
  }

  enableAudit(): this {
    this.controlOptions.audit = true;
    return this;
  }

  enableSandbox(): this {
    this.controlOptions.sandbox = true;
    return this;
  }

  async run(input: TInput, ctx?: AUIContext): Promise<TOutput> {
    const startTime = Date.now();
    
    try {
      this.validatePermissions(ctx);
      await this.checkRateLimit();
      
      const result = await super.run(input, ctx);
      
      if (this.controlOptions.audit) {
        this.executionLog.push({
          timestamp: new Date(),
          input,
          output: result,
          context: ctx ? { user: ctx.user, session: ctx.session } : undefined
        });
      }
      
      return result;
    } catch (error) {
      if (this.controlOptions.audit) {
        this.executionLog.push({
          timestamp: new Date(),
          input,
          error: error as Error,
          context: ctx ? { user: ctx.user, session: ctx.session } : undefined
        });
      }
      throw error;
    }
  }

  private validatePermissions(ctx?: AUIContext): void {
    if (!this.controlOptions.permissions) return;
    
    const isClient = !ctx?.isServer;
    const perms = this.controlOptions.permissions;
    
    if (isClient && !perms.allowClientExecution) {
      throw new Error('Client execution not allowed for this tool');
    }
    
    if (ctx?.isServer && !perms.allowServerExecution) {
      throw new Error('Server execution not allowed for this tool');
    }
  }

  private async checkRateLimit(): Promise<void> {
    if (!this.controlOptions.rateLimit) return;
    
    const now = Date.now();
    const { requestsPerMinute, requestsPerHour } = this.controlOptions.rateLimit;
    
    if (requestsPerMinute) {
      const recentMinute = this.executionLog.filter(
        log => now - log.timestamp.getTime() < 60000
      );
      if (recentMinute.length >= requestsPerMinute) {
        throw new Error('Rate limit exceeded (per minute)');
      }
    }
    
    if (requestsPerHour) {
      const recentHour = this.executionLog.filter(
        log => now - log.timestamp.getTime() < 3600000
      );
      if (recentHour.length >= requestsPerHour) {
        throw new Error('Rate limit exceeded (per hour)');
      }
    }
  }

  getExecutionLog() {
    return [...this.executionLog];
  }

  clearExecutionLog() {
    this.executionLog = [];
  }
}

export function createAITool(name: string, options?: AIControlOptions): AIControlledTool {
  return new AIControlledTool(name, options);
}

export const aiTools = {
  fileSystem: createAITool('fs-control', {
    permissions: {
      allowServerExecution: true,
      allowFileSystemAccess: true
    },
    audit: true
  })
    .input(z.object({
      action: z.enum(['read', 'write', 'delete', 'list']),
      path: z.string(),
      content: z.string().optional()
    }))
    .execute(async ({ input }) => {
      switch (input.action) {
        case 'read':
          return { content: 'File content here' };
        case 'write':
          return { success: true, path: input.path };
        case 'delete':
          return { success: true, deleted: input.path };
        case 'list':
          return { files: ['file1.txt', 'file2.txt'] };
        default:
          throw new Error('Unknown action');
      }
    }),

  database: createAITool('db-control', {
    permissions: {
      allowServerExecution: true,
      allowDatabaseAccess: true
    },
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerHour: 500
    },
    audit: true
  })
    .input(z.object({
      query: z.string(),
      params: z.array(z.any()).optional()
    }))
    .execute(async ({ input }) => {
      return { 
        rows: [], 
        query: input.query,
        executed: new Date().toISOString() 
      };
    }),

  uiManipulation: createAITool('ui-control', {
    permissions: {
      allowClientExecution: true
    },
    audit: true
  })
    .input(z.object({
      selector: z.string(),
      action: z.enum(['click', 'type', 'focus', 'scroll']),
      value: z.string().optional()
    }))
    .clientExecute(async ({ input }) => {
      const element = document.querySelector(input.selector);
      if (!element) throw new Error(`Element not found: ${input.selector}`);
      
      switch (input.action) {
        case 'click':
          (element as HTMLElement).click();
          break;
        case 'type':
          if (element instanceof HTMLInputElement && input.value) {
            element.value = input.value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
          }
          break;
        case 'focus':
          (element as HTMLElement).focus();
          break;
        case 'scroll':
          element.scrollIntoView({ behavior: 'smooth' });
          break;
      }
      
      return { success: true, action: input.action, selector: input.selector };
    }),

  apiCall: createAITool('api-control', {
    permissions: {
      allowNetworkRequests: true
    },
    rateLimit: {
      requestsPerMinute: 20
    },
    audit: true
  })
    .input(z.object({
      url: z.string().url(),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
      headers: z.record(z.string()).optional(),
      body: z.any().optional()
    }))
    .execute(async ({ input, ctx }) => {
      const response = await ctx!.fetch(input.url, {
        method: input.method,
        headers: input.headers,
        body: input.body ? JSON.stringify(input.body) : undefined
      });
      
      return {
        status: response.status,
        data: await response.json().catch(() => null),
        headers: Object.fromEntries(response.headers.entries())
      };
    })
};

export function createAIControlSystem() {
  const tools = new Map<string, AIControlledTool>();
  
  return {
    register(tool: AIControlledTool) {
      tools.set(tool.name, tool);
      return this;
    },
    
    get(name: string) {
      return tools.get(name);
    },
    
    clear() {
      tools.clear();
    },
    
    async execute(name: string, input: any, ctx?: AUIContext) {
      const tool = tools.get(name);
      if (!tool) throw new Error(`Tool ${name} not found`);
      return await tool.run(input, ctx);
    },
    
    getAuditLog(toolName?: string) {
      if (toolName) {
        const tool = tools.get(toolName);
        return tool ? tool.getExecutionLog() : [];
      }
      
      const allLogs: any[] = [];
      tools.forEach((tool, name) => {
        const logs = tool.getExecutionLog();
        logs.forEach(log => allLogs.push({ tool: name, ...log }));
      });
      return allLogs.sort((a, b) => 
        b.timestamp.getTime() - a.timestamp.getTime()
      );
    },
    
    listTools() {
      return Array.from(tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        tags: tool.tags,
        config: tool.toJSON()
      }));
    }
  };
}

export const aiControlSystem = createAIControlSystem();

Object.values(aiTools).forEach(tool => {
  aiControlSystem.register(tool);
});

export default aiControlSystem;
import { z } from 'zod';
import { AUITool, AUIContext } from './core';
import { AIControlledTool } from './ai-control';
import { clientTools, clientControlSystem } from './client-control';

export interface ToolMetadata {
  name: string;
  description?: string;
  tags: string[];
  category: 'server' | 'client' | 'hybrid' | 'custom';
  permissions?: string[];
  schema?: z.ZodType<any>;
  examples?: Array<{
    description: string;
    input: any;
    expectedOutput?: any;
  }>;
}

export class ToolRegistry {
  private tools = new Map<string, AUITool | AIControlledTool>();
  private metadata = new Map<string, ToolMetadata>();
  private categories = new Map<string, Set<string>>();
  private tagIndex = new Map<string, Set<string>>();

  constructor() {
    this.initializeBuiltInTools();
  }

  private initializeBuiltInTools() {
    // Only initialize client tools by default
    // Server tools should be registered separately in server-side code
    Object.entries(clientTools).forEach(([key, tool]) => {
      this.register(tool, {
        name: tool.name,
        description: tool.description,
        tags: tool.tags,
        category: 'client'
      });
    });
  }

  register(
    tool: AUITool | AIControlledTool,
    metadata?: Partial<ToolMetadata>
  ): this {
    const meta: ToolMetadata = {
      name: tool.name,
      description: tool.description,
      tags: tool.tags,
      category: metadata?.category || 'custom',
      permissions: metadata?.permissions,
      schema: tool.schema,
      examples: metadata?.examples,
      ...metadata
    };

    this.tools.set(tool.name, tool);
    this.metadata.set(tool.name, meta);

    if (!this.categories.has(meta.category)) {
      this.categories.set(meta.category, new Set());
    }
    this.categories.get(meta.category)!.add(tool.name);

    meta.tags.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(tool.name);
    });

    return this;
  }

  unregister(name: string): boolean {
    const tool = this.tools.get(name);
    if (!tool) return false;

    const meta = this.metadata.get(name);
    if (meta) {
      this.categories.get(meta.category)?.delete(name);
      meta.tags.forEach(tag => {
        this.tagIndex.get(tag)?.delete(name);
      });
    }

    this.tools.delete(name);
    this.metadata.delete(name);
    return true;
  }

  get(name: string): AUITool | AIControlledTool | undefined {
    return this.tools.get(name);
  }

  getMetadata(name: string): ToolMetadata | undefined {
    return this.metadata.get(name);
  }

  findByCategory(category: string): Array<AUITool | AIControlledTool> {
    const names = this.categories.get(category);
    if (!names) return [];
    return Array.from(names)
      .map(name => this.tools.get(name))
      .filter(Boolean) as Array<AUITool | AIControlledTool>;
  }

  findByTag(tag: string): Array<AUITool | AIControlledTool> {
    const names = this.tagIndex.get(tag);
    if (!names) return [];
    return Array.from(names)
      .map(name => this.tools.get(name))
      .filter(Boolean) as Array<AUITool | AIControlledTool>;
  }

  findByTags(tags: string[]): Array<AUITool | AIControlledTool> {
    const toolSets = tags.map(tag => this.tagIndex.get(tag) || new Set());
    if (toolSets.length === 0) return [];

    const intersection = toolSets.reduce((acc, set) => {
      return new Set([...acc].filter(x => set.has(x)));
    });

    return Array.from(intersection)
      .map(name => this.tools.get(name as string))
      .filter(Boolean) as Array<AUITool | AIControlledTool>;
  }

  search(query: string): Array<{
    tool: AUITool | AIControlledTool;
    metadata: ToolMetadata;
    relevance: number;
  }> {
    const results: Array<{
      tool: AUITool | AIControlledTool;
      metadata: ToolMetadata;
      relevance: number;
    }> = [];

    const lowerQuery = query.toLowerCase();

    this.tools.forEach((tool, name) => {
      const meta = this.metadata.get(name)!;
      let relevance = 0;

      if (name.toLowerCase().includes(lowerQuery)) {
        relevance += 10;
      }

      if (meta.description?.toLowerCase().includes(lowerQuery)) {
        relevance += 5;
      }

      meta.tags.forEach(tag => {
        if (tag.toLowerCase().includes(lowerQuery)) {
          relevance += 3;
        }
      });

      if (meta.category.toLowerCase().includes(lowerQuery)) {
        relevance += 2;
      }

      if (relevance > 0) {
        results.push({ tool, metadata: meta, relevance });
      }
    });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  async execute(
    name: string,
    input: any,
    context?: AUIContext
  ): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found in registry`);
    }

    const meta = this.metadata.get(name);
    const enhancedContext: AUIContext = {
      cache: context?.cache || new Map(),
      fetch: context?.fetch || globalThis.fetch,
      ...context,
      isServer: meta?.category === 'server' ? true : 
                meta?.category === 'client' ? false : 
                context?.isServer ?? (typeof window === 'undefined')
    };

    return await tool.run(input, enhancedContext);
  }

  list(): ToolMetadata[] {
    return Array.from(this.metadata.values());
  }

  listByCategory(): Record<string, ToolMetadata[]> {
    const result: Record<string, ToolMetadata[]> = {};
    
    this.categories.forEach((tools, category) => {
      result[category] = Array.from(tools)
        .map(name => this.metadata.get(name))
        .filter(Boolean) as ToolMetadata[];
    });

    return result;
  }

  exportSchema(): Record<string, any> {
    const schemas: Record<string, any> = {};
    
    this.tools.forEach((tool, name) => {
      const meta = this.metadata.get(name)!;
      schemas[name] = {
        name,
        description: meta.description,
        category: meta.category,
        tags: meta.tags,
        inputSchema: tool.schema ? zodToJsonSchema(tool.schema) : null,
        examples: meta.examples
      };
    });

    return schemas;
  }

  importTools(tools: Array<AUITool | AIControlledTool>, category?: 'server' | 'client' | 'hybrid' | 'custom'): void {
    tools.forEach(tool => {
      this.register(tool, { category: category || 'custom' });
    });
  }

  clear(): void {
    this.tools.clear();
    this.metadata.clear();
    this.categories.clear();
    this.tagIndex.clear();
  }

  getStats(): {
    totalTools: number;
    byCategory: Record<string, number>;
    byTag: Record<string, number>;
  } {
    const byCategory: Record<string, number> = {};
    this.categories.forEach((tools, category) => {
      byCategory[category] = tools.size;
    });

    const byTag: Record<string, number> = {};
    this.tagIndex.forEach((tools, tag) => {
      byTag[tag] = tools.size;
    });

    return {
      totalTools: this.tools.size,
      byCategory,
      byTag
    };
  }
}

function zodToJsonSchema(schema: z.ZodType<any>): any {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];

    Object.entries(shape).forEach(([key, value]: [string, any]) => {
      properties[key] = zodToJsonSchema(value);
      if (!value.isOptional()) {
        required.push(key);
      }
    });

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined
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
      items: zodToJsonSchema(schema.element)
    };
  }

  if (schema instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: schema.options
    };
  }

  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema(schema.unwrap());
  }

  return { type: 'any' };
}

export const globalToolRegistry = new ToolRegistry();

export class ToolDiscovery {
  private registry: ToolRegistry;

  constructor(registry: ToolRegistry = globalToolRegistry) {
    this.registry = registry;
  }

  async discoverTools(pattern?: string): Promise<ToolMetadata[]> {
    if (pattern) {
      return this.registry.search(pattern).map(r => r.metadata);
    }
    return this.registry.list();
  }

  async getToolCapabilities(name: string): Promise<{
    canExecuteOnServer: boolean;
    canExecuteOnClient: boolean;
    requiresAuth: boolean;
    rateLimit?: { requestsPerMinute?: number; requestsPerHour?: number };
  }> {
    const tool = this.registry.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found`);
    }

    const meta = this.registry.getMetadata(name);
    const isAIControlled = tool instanceof AIControlledTool;

    return {
      canExecuteOnServer: meta?.category === 'server' || meta?.category === 'hybrid',
      canExecuteOnClient: meta?.category === 'client' || meta?.category === 'hybrid',
      requiresAuth: meta?.permissions?.includes('auth') || false,
      rateLimit: isAIControlled ? (tool as any).controlOptions?.rateLimit : undefined
    };
  }

  async getRecommendedTools(context: {
    task?: string;
    tags?: string[];
    category?: string;
  }): Promise<ToolMetadata[]> {
    let tools: ToolMetadata[] = [];

    if (context.category) {
      tools = this.registry.findByCategory(context.category)
        .map(t => this.registry.getMetadata(t.name)!);
    } else if (context.tags && context.tags.length > 0) {
      tools = this.registry.findByTags(context.tags)
        .map(t => this.registry.getMetadata(t.name)!);
    } else if (context.task) {
      tools = this.registry.search(context.task).map(r => r.metadata);
    } else {
      tools = this.registry.list();
    }

    return tools.slice(0, 10);
  }
}

export const toolDiscovery = new ToolDiscovery(globalToolRegistry);
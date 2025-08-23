'use client';

import type { ToolCall, ToolContext, ToolDefinition, ToolResult } from '../types';

export interface ClientExecutorOptions {
  apiUrl?: string;
  cache?: Map<string, any>;
  cacheTimeout?: number;
}

export class ClientToolExecutor {
  private apiUrl: string;
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheTimeout: number;
  private tools: Map<string, ToolDefinition> = new Map();

  constructor(options: ClientExecutorOptions = {}) {
    this.apiUrl = options.apiUrl || '/api/aui';
    this.cache = new Map();
    this.cacheTimeout = options.cacheTimeout || 5 * 60 * 1000; // 5 minutes default
  }

  registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  private getCacheKey(toolName: string, input: any): string {
    return `${toolName}:${JSON.stringify(input)}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const tool = this.tools.get(toolCall.toolName);
    
    if (!tool) {
      return this.executeRemote(toolCall);
    }

    if (tool.clientExecute) {
      const cacheKey = this.getCacheKey(toolCall.toolName, toolCall.input);
      const cached = this.getFromCache(cacheKey);
      
      if (cached !== null) {
        return {
          id: toolCall.id,
          toolName: toolCall.toolName,
          output: cached,
        };
      }

      try {
        const context: ToolContext = {
          cache: new Map(),
          fetch: (url: string, options?: RequestInit) => {
            return fetch(url, options).then(res => res.json());
          },
        };

        const output = await tool.clientExecute({
          input: toolCall.input,
          ctx: context,
        });

        this.setCache(cacheKey, output);

        return {
          id: toolCall.id,
          toolName: toolCall.toolName,
          output,
        };
      } catch (error) {
        return {
          id: toolCall.id,
          toolName: toolCall.toolName,
          output: null,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return this.executeRemote(toolCall);
  }

  private async executeRemote(toolCall: ToolCall): Promise<ToolResult> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toolCall }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return {
        id: toolCall.id,
        toolName: toolCall.toolName,
        output: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async executeBatch(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    return Promise.all(toolCalls.map(call => this.execute(call)));
  }

  clearCache(): void {
    this.cache.clear();
  }
}
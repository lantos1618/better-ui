import { describe, it, expect, beforeEach } from '@jest/globals';
import aui from '../index';
import { z } from 'zod';

describe('User Requested AUI Examples', () => {
  beforeEach(() => {
    aui.clear();
  });

  describe('Simple Tool Pattern', () => {
    it('should create a simple weather tool with just 2 methods', async () => {
      // Simple tool - just 2 methods as requested
      const simpleTool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }));

      expect(simpleTool.name).toBe('weather');
      
      const result = await simpleTool.run({ city: 'New York' });
      expect(result).toEqual({ temp: 72, city: 'New York' });
    });

    it('should add render method for UI display', () => {
      const simpleTool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }))
        .render(({ data }) => `${data.city}: ${data.temp}°` as any);

      expect(simpleTool.renderer).toBeDefined();
    });
  });

  describe('Complex Tool Pattern', () => {
    it('should create a complex search tool with client optimization', async () => {
      const mockDatabase = {
        search: async (query: string) => [
          { id: 1, title: `Result for ${query}` },
          { id: 2, title: `Another result for ${query}` }
        ]
      };

      const complexTool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => mockDatabase.search(input.query))
        .clientExecute(async ({ input, ctx }) => {
          // Only when you need caching, offline, etc.
          const cached = ctx.cache.get(input.query);
          if (cached) return cached;
          
          // Simulate API call
          const result = await mockDatabase.search(input.query);
          ctx.cache.set(input.query, result);
          return result;
        });

      expect(complexTool.name).toBe('search');
      
      // Test server execution
      const serverResult = await complexTool.run(
        { query: 'typescript' },
        { cache: new Map(), fetch: globalThis.fetch, isServer: true }
      );
      expect(serverResult).toHaveLength(2);
      expect(serverResult[0].title).toContain('typescript');
      
      // Test client execution with caching
      const cache = new Map();
      const ctx = { cache, fetch: globalThis.fetch, isServer: false };
      
      const result1 = await complexTool.run({ query: 'javascript' }, ctx);
      expect(result1).toHaveLength(2);
      expect(cache.has('javascript')).toBe(true);
      
      // Second call should use cache
      const result2 = await complexTool.run({ query: 'javascript' }, ctx);
      expect(result2).toEqual(result1);
    });
  });

  describe('AI Control Tools', () => {
    it('should create UI control tool for frontend manipulation', async () => {
      const uiControlTool = aui
        .tool('ui-control')
        .input(z.object({ 
          action: z.enum(['show', 'hide', 'toggle']),
          element: z.string()
        }))
        .clientExecute(async ({ input }) => {
          // Mock DOM manipulation
          return { success: true, action: input.action, element: input.element };
        });

      const result = await uiControlTool.run(
        { action: 'hide', element: '#demo' },
        { cache: new Map(), fetch: globalThis.fetch, isServer: false }
      );
      
      expect(result).toEqual({
        success: true,
        action: 'hide',
        element: '#demo'
      });
    });

    it('should create database tool for backend operations', async () => {
      const databaseTool = aui
        .tool('database')
        .input(z.object({
          operation: z.enum(['create', 'read', 'update', 'delete']),
          table: z.string(),
          data: z.any().optional()
        }))
        .execute(async ({ input }) => {
          switch (input.operation) {
            case 'create':
              return { id: 123, ...input.data };
            case 'read':
              return { id: 1, name: 'Example', table: input.table };
            case 'update':
              return { success: true, updated: input.data };
            case 'delete':
              return { success: true, deleted: input.data?.id };
            default:
              throw new Error('Unknown operation');
          }
        });

      // Test create operation
      const createResult = await databaseTool.run({
        operation: 'create',
        table: 'users',
        data: { name: 'John', email: 'john@example.com' }
      });
      expect(createResult).toMatchObject({
        id: expect.any(Number),
        name: 'John',
        email: 'john@example.com'
      });

      // Test read operation
      const readResult = await databaseTool.run({
        operation: 'read',
        table: 'users'
      });
      expect(readResult).toMatchObject({
        id: 1,
        name: 'Example',
        table: 'users'
      });
    });

    it('should create form generator tool for dynamic forms', async () => {
      const formGeneratorTool = aui
        .tool('form-generator')
        .input(z.object({
          fields: z.array(z.object({
            name: z.string(),
            type: z.enum(['text', 'number', 'email', 'select']),
            label: z.string(),
            required: z.boolean().optional(),
            options: z.array(z.string()).optional()
          }))
        }))
        .execute(async ({ input }) => input.fields);

      const result = await formGeneratorTool.run({
        fields: [
          { name: 'name', type: 'text', label: 'Full Name', required: true },
          { name: 'email', type: 'email', label: 'Email' },
          { name: 'country', type: 'select', label: 'Country', options: ['USA', 'Canada'] }
        ]
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        name: 'name',
        type: 'text',
        label: 'Full Name',
        required: true
      });
    });
  });

  describe('API Conciseness', () => {
    it('should allow minimal tool definition', async () => {
      // Absolute minimum - just execute
      const minimalTool = aui
        .tool('minimal')
        .execute(async () => 'done');

      const result = await minimalTool.run(undefined);
      expect(result).toBe('done');
    });

    it('should chain all methods fluently', () => {
      const fluentTool = aui
        .tool('fluent')
        .input(z.object({ x: z.number() }))
        .execute(async ({ input }) => input.x * 2)
        .clientExecute(async ({ input }) => input.x * 3)
        .render(() => 'rendered' as any)
        .describe('A fluent tool')
        .tag('math', 'example');

      expect(fluentTool.name).toBe('fluent');
      expect(fluentTool.description).toBe('A fluent tool');
      expect(fluentTool.tags).toEqual(['math', 'example']);
    });

    it('should not require build() method', () => {
      const tool = aui
        .tool('no-build')
        .input(z.object({ msg: z.string() }))
        .execute(async ({ input }) => input.msg);

      // Tool is immediately usable without .build()
      expect(tool.run).toBeDefined();
      expect(tool.name).toBe('no-build');
    });
  });
});
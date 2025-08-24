import { describe, it, expect, beforeEach } from '@jest/globals';
import aui from '../index';
import { z } from 'zod';
import React from 'react';

describe('AUI Concise API', () => {
  beforeEach(() => {
    // Clear registry between tests
    aui.getTools().forEach(tool => {
      // Registry is cleared automatically in tests
    });
  });

  describe('Simple Tool Creation', () => {
    it('should create a simple tool with minimal API', () => {
      const tool = aui
        .tool('test-weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }))
        .render(({ data }) => React.createElement('div', {}, `${data.city}: ${data.temp}°`))
        .build();

      expect(tool.name).toBe('test-weather');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
      expect(tool.render).toBeDefined();
    });

    it('should support ultra-concise simple() API', () => {
      const tool = aui.simple(
        'test-greeting',
        z.object({ name: z.string() }),
        async (input) => `Hello, ${input.name}!`,
        (data) => React.createElement('h1', {}, data)
      );

      expect(tool.name).toBe('test-greeting');
      expect(tool.execute).toBeDefined();
    });

    it('should support quick mode with auto-build', () => {
      const tool = aui
        .quick('test-calc')
        .input(z.object({ a: z.number(), b: z.number() }))
        .execute(({ input }) => input.a + input.b)
        .render(({ data }) => React.createElement('span', {}, data));

      // Quick mode auto-builds, so tool should be complete
      expect(tool.name).toBe('test-calc');
      expect(tool.execute).toBeDefined();
    });
  });

  describe('Complex Tool Features', () => {
    it('should support client execution', () => {
      const tool = aui
        .tool('test-search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ results: [`server: ${input.query}`] }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx?.cache?.get(input.query);
          return cached || { results: [`client: ${input.query}`] };
        })
        .render(({ data }) => React.createElement('div', {}, data.results.join(', ')))
        .build();

      expect(tool.clientExecute).toBeDefined();
      expect(tool.isServerOnly).toBe(false);
    });

    it('should support server-only tools', () => {
      const tool = aui.server(
        'test-database',
        z.object({ sql: z.string() }),
        async (input) => ({ rows: [] }),
        (data) => React.createElement('pre', {}, JSON.stringify(data))
      );

      expect(tool.isServerOnly).toBe(true);
      expect(tool.clientExecute).toBeUndefined();
    });

    it('should support contextual tools', () => {
      const tool = aui.contextual(
        'test-profile',
        z.object({ userId: z.string() }),
        async ({ input, ctx }) => ({
          userId: input.userId,
          cached: ctx?.cache ? 'has-cache' : 'no-cache'
        }),
        (data) => React.createElement('div', {}, data.userId)
      );

      expect(tool.execute).toBeDefined();
      expect(tool.name).toBe('test-profile');
    });
  });

  describe('Tool Execution', () => {
    it('should execute simple tool correctly', async () => {
      const tool = aui
        .tool('test-exec')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => input.value * 2)
        .build();

      const result = await tool.execute({ input: { value: 5 } });
      expect(result).toBe(10);
    });

    it('should handle different parameter styles', async () => {
      // Simple parameter style
      const tool1 = aui
        .tool('test-param1')
        .input(z.object({ x: z.number() }))
        .execute(async (input) => input.x + 1)
        .build();

      // Destructured style
      const tool2 = aui
        .tool('test-param2')
        .input(z.object({ x: z.number() }))
        .execute(async ({ input }) => input.x + 2)
        .build();

      // With context style
      const tool3 = aui
        .tool('test-param3')
        .input(z.object({ x: z.number() }))
        .execute(async ({ input, ctx }) => input.x + 3)
        .build();

      const result1 = await tool1.execute({ input: { x: 10 } });
      const result2 = await tool2.execute({ input: { x: 10 } });
      const result3 = await tool3.execute({ input: { x: 10 } });

      expect(result1).toBe(11);
      expect(result2).toBe(12);
      expect(result3).toBe(13);
    });
  });

  describe('Tool Registration', () => {
    it('should register and retrieve tools', () => {
      const tool = aui.simple(
        'test-registered',
        z.object({ id: z.string() }),
        async (input) => input.id
      );

      const retrieved = aui.getTool('test-registered');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test-registered');
    });

    it('should list all registered tools', () => {
      aui.simple('test-tool1', z.object({}), async () => 'result1');
      aui.simple('test-tool2', z.object({}), async () => 'result2');

      const tools = aui.getTools();
      const names = tools.map(t => t.name);
      
      expect(names).toContain('test-tool1');
      expect(names).toContain('test-tool2');
    });
  });

  describe('Input Validation', () => {
    it('should validate input with Zod schema', async () => {
      const tool = aui
        .tool('test-validation')
        .input(z.object({
          email: z.string().email(),
          age: z.number().min(18)
        }))
        .execute(async ({ input }) => input)
        .build();

      // Valid input
      const validInput = { email: 'test@example.com', age: 25 };
      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);

      // Invalid input
      const invalidInput = { email: 'not-an-email', age: 15 };
      const invalidResult = tool.inputSchema.safeParse(invalidInput);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('Advanced Builder Methods', () => {
    it('should support handle() for combined input/execute', () => {
      const tool = aui
        .tool('test-handle')
        .handle(
          z.object({ text: z.string() }),
          async (input) => input.text.toUpperCase()
        )
        .render(({ data }) => React.createElement('div', {}, data))
        .build();

      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
    });

    it('should support run() for combined execute/render', () => {
      const tool = aui
        .tool('test-run')
        .input(z.object({ num: z.number() }))
        .run(
          async (input) => input.num * 3,
          (data) => React.createElement('span', {}, data)
        )
        .build();

      expect(tool.execute).toBeDefined();
      expect(tool.render).toBeDefined();
    });

    it('should support metadata and description', () => {
      const tool = aui
        .tool('test-meta')
        .description('A test tool with metadata')
        .metadata({ version: '1.0', author: 'test' })
        .input(z.object({}))
        .execute(async () => 'result')
        .build();

      expect(tool.description).toBe('A test tool with metadata');
      expect(tool.metadata).toEqual({ version: '1.0', author: 'test' });
    });

    it('should support output schema', () => {
      const outputSchema = z.object({ 
        success: z.boolean(),
        message: z.string() 
      });

      const tool = aui
        .tool('test-output')
        .input(z.object({ text: z.string() }))
        .output(outputSchema)
        .execute(async ({ input }) => ({
          success: true,
          message: input.text
        }))
        .build();

      expect(tool.outputSchema).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when execute is missing', () => {
      expect(() => {
        aui
          .tool('test-no-execute')
          .input(z.object({}))
          .build();
      }).toThrow('must have an execute handler');
    });

    it('should handle async errors in execute', async () => {
      const tool = aui
        .tool('test-error')
        .input(z.object({}))
        .execute(async () => {
          throw new Error('Test error');
        })
        .build();

      await expect(tool.execute({ input: {} })).rejects.toThrow('Test error');
    });
  });
});
import { describe, it, expect, beforeEach } from '@jest/globals';
import aui, { z } from '../index';
import { AIControlledTool, createAITool, aiControlSystem } from '../ai-control';
import { clientControlSystem } from '../client-control';

describe('AUI Complete System Tests', () => {
  beforeEach(() => {
    aui.clear();
    aiControlSystem.clear();
  });

  describe('Simple Tool Pattern', () => {
    it('should create a simple tool with execute and render', async () => {
      const simpleTool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }))
        .render(({ data }) => `${data.city}: ${data.temp}°` as any);

      expect(simpleTool.name).toBe('weather');
      
      const result = await simpleTool.run({ city: 'New York' });
      expect(result).toEqual({ temp: 72, city: 'New York' });
    });

    it('should validate input schema', async () => {
      const tool = aui
        .tool('validated')
        .input(z.object({ 
          required: z.string(),
          optional: z.number().optional() 
        }))
        .execute(async ({ input }) => input);

      await expect(tool.run({ required: 'test' })).resolves.toEqual({ required: 'test' });
      await expect(tool.run({ missing: 'field' } as any)).rejects.toThrow();
    });
  });

  describe('Complex Tool Pattern', () => {
    it('should support client and server execution', async () => {
      const complexTool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ 
          results: [`server: ${input.query}`] 
        }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.query);
          if (cached) return cached;
          
          const result = { results: [`client: ${input.query}`] };
          ctx.cache.set(input.query, result);
          return result;
        });

      // Server execution
      const serverResult = await complexTool.run(
        { query: 'test' }, 
        { isServer: true, cache: new Map(), fetch: fetch }
      );
      expect(serverResult.results[0]).toContain('server');

      // Client execution
      const clientResult = await complexTool.run(
        { query: 'test' }, 
        { isServer: false, cache: new Map(), fetch: fetch }
      );
      expect(clientResult.results[0]).toContain('client');
    });

    it('should support middleware', async () => {
      const middlewareTool = aui
        .tool('with-middleware')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ result: input.value }))
        .middleware(async ({ input, next }) => {
          input.value = input.value * 2;
          const result = await next();
          result.result = result.result + 10;
          return result;
        });

      const result = await middlewareTool.run({ value: 5 });
      expect(result).toEqual({ result: 20 }); // (5 * 2) + 10
    });
  });

  describe('AI Control System', () => {
    it('should create AI-controlled tools with permissions', () => {
      const aiTool = createAITool('ai-tool', {
        permissions: {
          allowClientExecution: true,
          allowServerExecution: false
        }
      })
        .input(z.object({ action: z.string() }))
        .execute(async ({ input }) => ({ executed: input.action }));

      expect(aiTool).toBeInstanceOf(AIControlledTool);
      expect(aiTool.name).toBe('ai-tool');
    });

    it('should enforce rate limiting', async () => {
      const rateLimitedTool = createAITool('rate-limited', {
        rateLimit: {
          requestsPerMinute: 2
        },
        audit: true  // Enable audit to track execution for rate limiting
      })
        .input(z.object({ id: z.number() }))
        .execute(async ({ input }) => ({ id: input.id }));

      // First two requests should succeed
      await expect(rateLimitedTool.run({ id: 1 })).resolves.toEqual({ id: 1 });
      await expect(rateLimitedTool.run({ id: 2 })).resolves.toEqual({ id: 2 });
      
      // Third request should fail
      await expect(rateLimitedTool.run({ id: 3 })).rejects.toThrow('Rate limit exceeded');
    });

    it('should track execution with audit', async () => {
      const auditedTool = createAITool('audited', { audit: true })
        .input(z.object({ action: z.string() }))
        .execute(async ({ input }) => ({ result: input.action }));

      await auditedTool.run({ action: 'test1' });
      await auditedTool.run({ action: 'test2' });

      const log = auditedTool.getExecutionLog();
      expect(log).toHaveLength(2);
      expect(log[0].input).toEqual({ action: 'test1' });
      expect(log[1].input).toEqual({ action: 'test2' });
    });
  });

  describe('Tool Registry', () => {
    it('should register and retrieve tools', () => {
      const tool1 = aui.tool('tool1')
        .input(z.object({ x: z.number() }))
        .execute(async ({ input }) => input);

      const tool2 = aui.tool('tool2')
        .input(z.object({ y: z.string() }))
        .execute(async ({ input }) => input);

      expect(aui.has('tool1')).toBe(true);
      expect(aui.has('tool2')).toBe(true);
      expect(aui.getToolNames()).toEqual(['tool1', 'tool2']);
    });

    it('should support tool tags and discovery', () => {
      const apiTool = aui.tool('api')
        .tag('backend', 'api', 'rest')
        .execute(async () => ({ success: true }));

      const uiTool = aui.tool('ui')
        .tag('frontend', 'ui', 'dom')
        .execute(async () => ({ rendered: true }));

      expect(aui.findByTag('backend')).toContain(apiTool);
      expect(aui.findByTag('frontend')).toContain(uiTool);
      expect(aui.findByTags('backend', 'api')).toContain(apiTool);
    });
  });

  describe('Tool Execution', () => {
    it('should execute tools through AUI instance', async () => {
      aui.tool('executor')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ doubled: input.value * 2 }));

      const result = await aui.execute('executor', { value: 5 });
      expect(result).toEqual({ doubled: 10 });
    });

    it('should handle execution errors', async () => {
      aui.tool('error-tool')
        .execute(async () => {
          throw new Error('Execution failed');
        });

      await expect(aui.execute('error-tool', {})).rejects.toThrow('Execution failed');
    });
  });

  describe('Client Control System', () => {
    it('should list available client tools', () => {
      const tools = clientControlSystem.listClientTools();
      
      expect(tools).toContainEqual(
        expect.objectContaining({
          name: 'client-dom',
          description: 'Manipulate DOM elements on the client'
        })
      );
      
      expect(tools).toContainEqual(
        expect.objectContaining({
          name: 'client-forms',
          description: 'Control and interact with forms'
        })
      );
    });
  });

  describe('Tool Serialization', () => {
    it('should serialize tool configuration', () => {
      const tool = aui.tool('serializable')
        .describe('A test tool')
        .tag('test', 'demo')
        .input(z.object({ x: z.number() }))
        .execute(async ({ input }) => input)
        .clientExecute(async ({ input }) => input)
        .render(() => null as any);

      const json = tool.toJSON();
      
      expect(json).toEqual({
        name: 'serializable',
        description: 'A test tool',
        tags: ['test', 'demo'],
        hasInput: true,
        hasExecute: true,
        hasClientExecute: true,
        hasRender: true,
        hasMiddleware: false
      });
    });
  });

  describe('Context Management', () => {
    it('should create and use context correctly', async () => {
      const contextTool = aui.tool('context-test')
        .execute(async ({ ctx }) => ({
          isServer: ctx?.isServer,
          hasCache: ctx?.cache instanceof Map,
          hasFetch: typeof ctx?.fetch === 'function'
        }));

      const result = await contextTool.run({}, aui.createContext({ 
        isServer: true,
        user: { id: 1 }
      }));

      expect(result.isServer).toBe(true);
      expect(result.hasCache).toBe(true);
      expect(result.hasFetch).toBe(true);
    });
  });
});
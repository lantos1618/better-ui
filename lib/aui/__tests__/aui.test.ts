import aui, { AUI, AUITool } from '../index';
import { z } from 'zod';

describe('AUI System', () => {
  let testAUI: AUI;
  
  beforeEach(() => {
    testAUI = new AUI();
  });
  
  describe('Tool Creation', () => {
    it('should create a simple tool with execute and render', () => {
      const tool = testAUI
        .tool('test')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ result: input.value * 2 }));
      
      expect(tool.name).toBe('test');
      expect(tool).toBeInstanceOf(AUITool);
    });
    
    it('should chain methods fluently', () => {
      const tool = testAUI
        .tool('chain-test')
        .input(z.object({ text: z.string() }))
        .execute(async ({ input }) => ({ message: input.text }))
        .describe('A test tool')
        .tag('test', 'example');
      
      expect(tool.name).toBe('chain-test');
      expect(tool.description).toBe('A test tool');
      expect(tool.tags).toContain('test');
      expect(tool.tags).toContain('example');
    });
    
    it('should support clientExecute for client-side optimization', () => {
      const tool = testAUI
        .tool('client-tool')
        .input(z.object({ id: z.string() }))
        .execute(async ({ input }) => ({ id: input.id, source: 'server' }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.id);
          return cached || { id: input.id, source: 'client' };
        });
      
      expect(tool.name).toBe('client-tool');
    });
  });
  
  describe('Tool Execution', () => {
    it('should execute a tool with valid input', async () => {
      const tool = testAUI
        .tool('calc')
        .input(z.object({ a: z.number(), b: z.number() }))
        .execute(async ({ input }) => ({ sum: input.a + input.b }));
      
      const result = await tool.run({ a: 5, b: 3 });
      expect(result).toEqual({ sum: 8 });
    });
    
    it('should validate input with Zod schema', async () => {
      const tool = testAUI
        .tool('strict')
        .input(z.object({ 
          email: z.string().email(),
          age: z.number().min(0).max(120)
        }))
        .execute(async ({ input }) => ({ valid: true }));
      
      await expect(
        tool.run({ email: 'invalid', age: 25 })
      ).rejects.toThrow();
      
      const result = await tool.run({ email: 'test@example.com', age: 25 });
      expect(result).toEqual({ valid: true });
    });
    
    it('should use clientExecute when not on server', async () => {
      const tool = testAUI
        .tool('hybrid')
        .input(z.object({ key: z.string() }))
        .execute(async ({ input }) => ({ value: 'server', key: input.key }))
        .clientExecute(async ({ input }) => ({ value: 'client', key: input.key }));
      
      const clientCtx = { 
        cache: new Map(), 
        fetch: jest.fn(),
        isServer: false 
      };
      
      const result = await tool.run({ key: 'test' }, clientCtx);
      expect(result).toEqual({ value: 'client', key: 'test' });
    });
    
    it('should apply middleware in order', async () => {
      const order: number[] = [];
      
      const tool = testAUI
        .tool('middleware-test')
        .input(z.object({ value: z.number() }))
        .middleware(async ({ input, next }) => {
          order.push(1);
          const result = await next();
          order.push(3);
          return result;
        })
        .middleware(async ({ input, next }) => {
          order.push(2);
          return next();
        })
        .execute(async ({ input }) => {
          return { value: input.value * 2 };
        });
      
      const result = await tool.run({ value: 5 });
      expect(result).toEqual({ value: 10 });
      expect(order).toEqual([1, 2, 3]);
    });
  });
  
  describe('Tool Registry', () => {
    it('should register and retrieve tools', () => {
      const tool1 = testAUI.tool('tool1');
      const tool2 = testAUI.tool('tool2');
      
      expect(testAUI.get('tool1')).toBe(tool1);
      expect(testAUI.get('tool2')).toBe(tool2);
      expect(testAUI.has('tool1')).toBe(true);
      expect(testAUI.has('nonexistent')).toBe(false);
    });
    
    it('should list all tools', () => {
      testAUI.tool('a').tag('type1');
      testAUI.tool('b').tag('type2');
      testAUI.tool('c').tag('type1', 'type2');
      
      const tools = testAUI.list();
      expect(tools).toHaveLength(3);
      expect(testAUI.getToolNames()).toEqual(['a', 'b', 'c']);
    });
    
    it('should find tools by tags', () => {
      testAUI.tool('auth').tag('security', 'user');
      testAUI.tool('db').tag('data', 'storage');
      testAUI.tool('api').tag('network', 'data');
      
      const dataTools = testAUI.findByTag('data');
      expect(dataTools).toHaveLength(2);
      
      const securityTools = testAUI.findByTag('security');
      expect(securityTools).toHaveLength(1);
      expect(securityTools[0].name).toBe('auth');
    });
    
    it('should clear and remove tools', () => {
      testAUI.tool('temp1');
      testAUI.tool('temp2');
      
      expect(testAUI.has('temp1')).toBe(true);
      testAUI.remove('temp1');
      expect(testAUI.has('temp1')).toBe(false);
      
      testAUI.clear();
      expect(testAUI.list()).toHaveLength(0);
    });
  });
  
  describe('Context Management', () => {
    it('should create default context', () => {
      const ctx = testAUI.createContext();
      
      expect(ctx.cache).toBeInstanceOf(Map);
      expect(ctx.fetch).toBeDefined();
      expect(ctx.isServer).toBe(typeof window === 'undefined');
    });
    
    it('should merge context additions', () => {
      const ctx = testAUI.createContext({
        user: { id: '123', name: 'Test' },
        session: { token: 'abc' }
      });
      
      expect(ctx.user).toEqual({ id: '123', name: 'Test' });
      expect(ctx.session).toEqual({ token: 'abc' });
      expect(ctx.cache).toBeInstanceOf(Map);
    });
    
    it('should cache results in context', async () => {
      let callCount = 0;
      
      const tool = testAUI
        .tool('cacheable')
        .input(z.object({ id: z.string() }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.id);
          if (cached) return cached;
          
          callCount++;
          const result = { id: input.id, data: 'fetched' };
          ctx.cache.set(input.id, result);
          return result;
        });
      
      const ctx = testAUI.createContext();
      ctx.isServer = false; // Force client execution
      
      const result1 = await tool.run({ id: 'test' }, ctx);
      const result2 = await tool.run({ id: 'test' }, ctx);
      
      expect(callCount).toBe(1);
      expect(result1).toEqual(result2);
    });
  });
  
  describe('Error Handling', () => {
    it('should throw error when tool not found', async () => {
      await expect(
        testAUI.execute('nonexistent', {})
      ).rejects.toThrow('Tool "nonexistent" not found');
    });
    
    it('should throw error when execute handler missing', async () => {
      const tool = testAUI
        .tool('incomplete')
        .input(z.object({ value: z.number() }));
      
      await expect(
        tool.run({ value: 5 })
      ).rejects.toThrow('Tool incomplete has no execute handler');
    });
    
    it('should handle errors in execute handler', async () => {
      const tool = testAUI
        .tool('error-tool')
        .execute(async () => {
          throw new Error('Execution failed');
        });
      
      await expect(tool.run({})).rejects.toThrow('Execution failed');
    });
  });
  
  describe('Tool Serialization', () => {
    it('should serialize tool to JSON', () => {
      const tool = testAUI
        .tool('serializable')
        .input(z.object({ test: z.string() }))
        .execute(async () => ({ result: 'ok' }))
        .clientExecute(async () => ({ result: 'client' }))
        .describe('A serializable tool')
        .tag('test', 'json');
      
      tool.render(() => null as any);
      
      const json = tool.toJSON();
      
      expect(json).toEqual({
        name: 'serializable',
        description: 'A serializable tool',
        tags: ['test', 'json'],
        hasInput: true,
        hasExecute: true,
        hasClientExecute: true,
        hasRender: true,
        hasMiddleware: false
      });
    });
  });
});
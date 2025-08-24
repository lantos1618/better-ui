import { describe, it, expect, beforeEach } from '@jest/globals';
import aui from '../lib/aui';
import { z } from 'zod';

describe('AUI - Concise API', () => {
  beforeEach(() => {
    aui.clear();
  });

  describe('Tool Creation', () => {
    it('creates a simple tool', () => {
      const tool = aui
        .tool('test')
        .input(z.object({ value: z.number() }))
        .execute(({ input }) => input.value * 2);

      expect(tool.name).toBe('test');
    });

    it('creates tool with simple helper', () => {
      const tool = aui.simple(
        'calc',
        z.object({ a: z.number(), b: z.number() }),
        ({ a, b }) => a + b
      );

      expect(tool.name).toBe('calc');
    });
  });

  describe('Tool Execution', () => {
    it('executes a tool', async () => {
      const tool = aui
        .tool('double')
        .input(z.object({ value: z.number() }))
        .execute(({ input }) => input.value * 2);

      const result = await tool.run({ value: 5 });
      expect(result).toBe(10);
    });

    it('validates input', async () => {
      const tool = aui
        .tool('strict')
        .input(z.object({ email: z.string().email() }))
        .execute(({ input }) => input);

      await expect(tool.run({ email: 'invalid' }))
        .rejects.toThrow();
    });

    it('uses client execution with context', async () => {
      const tool = aui
        .tool('cached')
        .input(z.object({ key: z.string() }))
        .execute(({ input }) => `server: ${input.key}`)
        .clientExecute(({ input, ctx }) => {
          const cached = ctx.cache.get(input.key);
          return cached || `client: ${input.key}`;
        });

      const ctx = aui.createContext();
      ctx.cache.set('test', 'cached value');
      
      const result = await tool.run({ key: 'test' }, ctx);
      expect(result).toBe('cached value');
    });
  });

  describe('AI Tools', () => {
    it('creates AI tool with retry', async () => {
      let attempts = 0;
      const tools = aui.aiTools({
        flaky: {
          input: z.object({ value: z.number() }),
          execute: () => {
            attempts++;
            if (attempts < 3) throw new Error('Failed');
            return 'success';
          },
          retry: 3
        }
      });

      const result = await tools.flaky.run({ value: 1 });
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });
  });
});
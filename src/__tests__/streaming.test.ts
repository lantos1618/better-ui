/**
 * Tests for Tool streaming functionality
 */

import { z } from 'zod';
import { tool, Tool } from '../tool';

// Helper to create a delay
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Type for collected stream chunks
interface StreamChunk<T> {
  partial: Partial<T>;
  done: boolean;
}

describe('Tool Streaming', () => {
  describe('.stream() handler', () => {
    it('registers a stream handler', () => {
      const t = tool({
        name: 'test',
        input: z.object({ city: z.string() }),
        output: z.object({ temp: z.number(), forecast: z.string() }),
      });

      expect(t.hasStream).toBe(false);

      t.stream(async ({ city }, { stream }) => {
        stream({ temp: 72 });
        return { temp: 72, forecast: 'sunny' };
      });

      expect(t.hasStream).toBe(true);
    });

    it('returns this for chaining', () => {
      const t = tool({
        name: 'test',
        input: z.object({ x: z.number() }),
        output: z.object({ result: z.number() }),
      });

      const result = t.stream(async ({ x }, { stream }) => {
        stream({ result: x });
        return { result: x };
      });

      expect(result).toBe(t);
    });
  });

  describe('runStream()', () => {
    it('yields partial updates then final result', async () => {
      const t = tool({
        name: 'weather',
        input: z.object({ city: z.string() }),
        output: z.object({ temp: z.number(), forecast: z.string() }),
      });

      t.server(async ({ city }) => ({ temp: 72, forecast: 'sunny' }));
      t.stream(async ({ city }, { stream }) => {
        stream({ temp: 72 });
        await delay(10);
        stream({ forecast: 'sunny' });
        await delay(10);
        return { temp: 72, forecast: 'sunny' };
      });

      const chunks: StreamChunk<{ temp: number; forecast: string }>[] = [];
      for await (const chunk of t.runStream({ city: 'London' }, { isServer: true })) {
        chunks.push(chunk);
      }

      // Should have at least the partial updates + final
      expect(chunks.length).toBeGreaterThanOrEqual(2);

      // Last chunk should be done
      const last = chunks[chunks.length - 1];
      expect(last.done).toBe(true);
      expect(last.partial).toEqual({ temp: 72, forecast: 'sunny' });

      // Non-final chunks should not be done
      for (let i = 0; i < chunks.length - 1; i++) {
        expect(chunks[i].done).toBe(false);
      }
    });

    it('falls back to run() when no stream handler is defined', async () => {
      const t = tool({
        name: 'fallback',
        input: z.object({ x: z.number() }),
        output: z.object({ y: z.number() }),
      });

      t.server(({ x }) => ({ y: x * 2 }));

      const chunks: StreamChunk<{ y: number }>[] = [];
      for await (const chunk of t.runStream({ x: 5 }, { isServer: true })) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual({
        partial: { y: 10 },
        done: true,
      });
    });

    it('validates input schema', async () => {
      const t = tool({
        name: 'validated',
        input: z.object({ x: z.number() }),
        output: z.object({ result: z.number() }),
      });

      t.stream(async ({ x }, { stream }) => {
        stream({ result: x });
        return { result: x };
      });

      // @ts-expect-error - deliberately passing wrong type to test validation
      const gen = t.runStream({ x: 'not-a-number' }, { isServer: true });
      await expect(gen.next()).rejects.toThrow();
    });

    it('validates output schema only on final result', async () => {
      const t = tool({
        name: 'output-val',
        input: z.object({ x: z.number() }),
        output: z.object({ y: z.number(), label: z.string() }),
      });

      t.stream(async ({ x }, { stream }) => {
        // Partial: only y, missing label - should be fine for partial
        stream({ y: x * 2 });
        await delay(10);
        // Final result has all fields
        return { y: x * 2, label: 'done' };
      });

      const chunks: StreamChunk<{ y: number; label: string }>[] = [];
      for await (const chunk of t.runStream({ x: 3 }, { isServer: true })) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      expect(chunks[chunks.length - 1].done).toBe(true);
      expect(chunks[chunks.length - 1].partial).toEqual({ y: 6, label: 'done' });
    });

    it('throws when final result fails output validation', async () => {
      const t = tool({
        name: 'bad-output',
        input: z.object({ x: z.number() }),
        output: z.object({ y: z.number(), label: z.string() }),
      });

      // Deliberately return invalid output (missing 'label') to test validation
      t.stream(async ({ x }, { stream }) => {
        stream({ y: x * 2 });
        return { y: x * 2 } as { y: number; label: string };
      });

      const chunks: StreamChunk<{ y: number; label: string }>[] = [];
      await expect(async () => {
        for await (const chunk of t.runStream({ x: 3 }, { isServer: true })) {
          chunks.push(chunk);
        }
      }).rejects.toThrow();
    });

    it('propagates errors from stream handler', async () => {
      const t = tool({
        name: 'error-stream',
        input: z.object({ x: z.number() }),
        output: z.object({ value: z.boolean() }),
      });

      t.stream(async ({ x }, { stream }) => {
        stream({ value: true });
        await delay(10);
        throw new Error('Stream failed');
      });

      const chunks: StreamChunk<{ value: boolean }>[] = [];
      await expect(async () => {
        for await (const chunk of t.runStream({ x: 1 }, { isServer: true })) {
          chunks.push(chunk);
        }
      }).rejects.toThrow('Stream failed');

      // Should have received the partial before the error
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks[0].done).toBe(false);
    });

    it('handles synchronous stream calls', async () => {
      const t = tool({
        name: 'sync-stream',
        input: z.object({ x: z.number() }),
        output: z.object({ step: z.number(), complete: z.boolean() }),
      });

      t.stream(async ({ x }, { stream }) => {
        // All stream calls happen synchronously before any await
        stream({ step: 1 });
        stream({ step: 2 });
        stream({ step: 3 });
        return { step: 3, complete: true };
      });

      const chunks: StreamChunk<{ step: number; complete: boolean }>[] = [];
      for await (const chunk of t.runStream({ x: 1 }, { isServer: true })) {
        chunks.push(chunk);
      }

      // Should get all partials + final
      expect(chunks.length).toBeGreaterThanOrEqual(2);
      expect(chunks[chunks.length - 1].done).toBe(true);
    });
  });

  describe('ToolBuilder with stream', () => {
    it('supports stream in fluent builder', () => {
      const t = tool('builder-stream')
        .input(z.object({ x: z.number() }))
        .output(z.object({ result: z.number() }))
        .stream(async ({ x }, { stream }) => {
          stream({ result: x });
          return { result: x };
        })
        .build();

      expect(t.hasStream).toBe(true);
    });

    it('runStream works via builder proxy', async () => {
      const builder = tool('proxy-stream')
        .input(z.object({ x: z.number() }))
        .output(z.object({ y: z.number() }))
        .server(({ x }) => ({ y: x + 1 }))
        .stream(async ({ x }, { stream }) => {
          stream({ y: x });
          return { y: x + 1 };
        });

      const chunks: StreamChunk<{ y: number }>[] = [];
      for await (const chunk of builder.runStream({ x: 5 }, { isServer: true })) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      expect(chunks[chunks.length - 1]).toEqual({
        partial: { y: 6 },
        done: true,
      });
    });
  });

  describe('toJSON includes hasStream', () => {
    it('reports hasStream: false when no stream handler', () => {
      const t = tool({
        name: 'no-stream',
        input: z.object({ x: z.number() }),
      });

      expect(t.toJSON().hasStream).toBe(false);
    });

    it('reports hasStream: true when stream handler defined', () => {
      const t = tool({
        name: 'has-stream',
        input: z.object({ x: z.number() }),
        output: z.object({ result: z.number() }),
      });

      t.stream(async ({ x }, { stream }) => {
        return { result: x };
      });

      expect(t.toJSON().hasStream).toBe(true);
    });
  });
});

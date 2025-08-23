import { describe, it, expect, beforeEach } from '@jest/globals';
import { z } from 'zod';
import { ToolExecutor } from '../server/executor';
import { createRegistry } from '../core/registry';
import aui from '../index';
import type { ToolCall } from '../types/index';

describe('Tool Executor', () => {
  let executor: ToolExecutor;
  let registry: ReturnType<typeof createRegistry>;

  beforeEach(() => {
    registry = createRegistry();
    executor = new ToolExecutor({ registry });
  });

  it('should execute a tool successfully', async () => {
    const tool = aui
      .tool('math')
      .input(z.object({ a: z.number(), b: z.number() }))
      .execute(async ({ input }) => ({ sum: input.a + input.b }))
      .build();

    registry.register(tool);

    const toolCall: ToolCall = {
      id: 'test-1',
      toolName: 'math',
      input: { a: 5, b: 3 },
    };

    const result = await executor.execute(toolCall);

    expect(result.id).toBe('test-1');
    expect(result.toolName).toBe('math');
    expect(result.output).toEqual({ sum: 8 });
    expect(result.error).toBeUndefined();
  });

  it('should handle tool not found error', async () => {
    const toolCall: ToolCall = {
      id: 'test-2',
      toolName: 'non-existent',
      input: {},
    };

    const result = await executor.execute(toolCall);

    expect(result.id).toBe('test-2');
    expect(result.error).toBe('Tool "non-existent" not found');
    expect(result.output).toBeNull();
  });

  it('should handle validation errors', async () => {
    const tool = aui
      .tool('strict-tool')
      .input(z.object({ 
        email: z.string().email(),
        age: z.number().min(18),
      }))
      .execute(async ({ input }) => input)
      .build();

    registry.register(tool);

    const toolCall: ToolCall = {
      id: 'test-3',
      toolName: 'strict-tool',
      input: { email: 'invalid', age: 10 },
    };

    const result = await executor.execute(toolCall);

    expect(result.id).toBe('test-3');
    expect(result.error).toBeDefined();
    expect(result.output).toBeNull();
  });

  it('should handle execution errors', async () => {
    const tool = aui
      .tool('error-tool')
      .input(z.object({ trigger: z.boolean() }))
      .execute(async ({ input }) => {
        if (input.trigger) {
          throw new Error('Execution failed');
        }
        return { success: true };
      })
      .build();

    registry.register(tool);

    const toolCall: ToolCall = {
      id: 'test-4',
      toolName: 'error-tool',
      input: { trigger: true },
    };

    const result = await executor.execute(toolCall);

    expect(result.id).toBe('test-4');
    expect(result.error).toBe('Execution failed');
    expect(result.output).toBeNull();
  });

  it('should execute batch of tools', async () => {
    const addTool = aui
      .tool('add')
      .input(z.object({ a: z.number(), b: z.number() }))
      .execute(async ({ input }) => input.a + input.b)
      .build();

    const multiplyTool = aui
      .tool('multiply')
      .input(z.object({ a: z.number(), b: z.number() }))
      .execute(async ({ input }) => input.a * input.b)
      .build();

    registry.register(addTool);
    registry.register(multiplyTool);

    const toolCalls: ToolCall[] = [
      { id: 'batch-1', toolName: 'add', input: { a: 5, b: 3 } },
      { id: 'batch-2', toolName: 'multiply', input: { a: 4, b: 7 } },
    ];

    const results = await executor.executeBatch(toolCalls);

    expect(results).toHaveLength(2);
    expect(results[0].output).toBe(8);
    expect(results[1].output).toBe(28);
  });
});
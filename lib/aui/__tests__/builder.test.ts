import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';
import aui from '../index';

describe('AUI Builder', () => {
  it('should create a simple tool', () => {
    const tool = aui
      .tool('test-tool')
      .description('A test tool')
      .input(z.object({ name: z.string() }))
      .execute(async ({ input }) => ({ greeting: `Hello, ${input.name}!` }))
      .build();

    expect(tool.name).toBe('test-tool');
    expect(tool.description).toBe('A test tool');
    expect(tool.execute).toBeDefined();
    expect(tool.inputSchema).toBeDefined();
  });

  it('should validate input schema', () => {
    const tool = aui
      .tool('validation-test')
      .input(z.object({ 
        age: z.number().min(0).max(120),
        name: z.string().min(1),
      }))
      .execute(async ({ input }) => input)
      .build();

    const validInput = { age: 25, name: 'John' };
    const invalidInput = { age: -5, name: '' };

    expect(() => tool.inputSchema.parse(validInput)).not.toThrow();
    expect(() => tool.inputSchema.parse(invalidInput)).toThrow();
  });

  it('should support render function', () => {
    const renderFn = (props: { data: any }) => {
      return { type: 'div', props: { children: props.data.message } } as any;
    };

    const tool = aui
      .tool('render-test')
      .input(z.object({ text: z.string() }))
      .execute(async ({ input }) => ({ message: input.text }))
      .render(renderFn)
      .build();

    expect(tool.render).toBe(renderFn);
  });

  it('should support client execution', () => {
    const clientExecuteFn = async ({ input }: any) => {
      return { server: true, data: input };
    };

    const tool = aui
      .tool('client-test')
      .input(z.object({ id: z.number() }))
      .execute(async ({ input }) => ({ server: true, data: input }))
      .clientExecute(clientExecuteFn)
      .build();

    expect(tool.clientExecute).toBeDefined();
    expect(typeof tool.clientExecute).toBe('function');
  });

  it('should provide default input schema if not specified', () => {
    const tool = aui
      .tool('no-input')
      .execute(async () => ({ result: 'test' }))
      .build();
    
    expect(tool.inputSchema).toBeDefined();
    // Should default to empty object schema
    expect(() => tool.inputSchema.parse({})).not.toThrow();
  });

  it('should throw error if no execute handler', () => {
    expect(() => {
      aui
        .tool('no-execute')
        .input(z.object({ test: z.string() }))
        .build();
    }).toThrow('Tool "no-execute" must have an execute handler');
  });

  it('should support simplified execute syntax', async () => {
    const tool = aui
      .tool('simple-syntax')
      .input(z.object({ city: z.string() }))
      .execute(async ({ input }) => ({ temp: 72, city: input.city }))
      .build();

    const result = await tool.execute({ 
      input: { city: 'NYC' },
      ctx: { cache: new Map(), fetch: globalThis.fetch }
    });

    expect(result).toEqual({ temp: 72, city: 'NYC' });
  });

  it('should create minimal tool with just 2 methods', () => {
    const tool = aui
      .tool('minimal')
      .input(z.object({ msg: z.string() }))
      .execute(async ({ input }) => input.msg)
      .render((props) => ({ type: 'div', props: { children: props.data } } as any))
      .build();

    expect(tool.name).toBe('minimal');
    expect(tool.execute).toBeDefined();
    expect(tool.render).toBeDefined();
  });

  it('should support serverOnly flag', () => {
    const tool = aui
      .tool('server-only')
      .input(z.object({ secret: z.string() }))
      .execute(async ({ input }) => ({ processed: input.secret }))
      .serverOnly()
      .build();

    expect(tool.isServerOnly).toBe(true);
  });

  it('should default render if not provided', () => {
    const tool = aui
      .tool('no-render')
      .input(z.object({ value: z.string() }))
      .execute(async ({ input }) => input.value)
      .build();

    expect(tool.render).toBeDefined();
  });
});
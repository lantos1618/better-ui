import React from 'react';
import { z } from 'zod';
import aui from '../ultra-concise';

describe('Ultra-Concise AUI API', () => {
  describe('Simple Tool Creation', () => {
    it('should create a simple tool with just execute and render', () => {
      const tool = aui
        .tool('simple')
        .execute(async ({ input }: { input: { name: string } }) => `Hello, ${input.name}`)
        .render(({ data }) => React.createElement('div', null, data));
      
      expect(tool.name).toBe('simple');
      expect(tool.execute).toBeDefined();
      expect(tool.render).toBeDefined();
    });
    
    it('should auto-build when accessing tool properties', () => {
      const tool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }))
        .render(({ data }) => React.createElement('div', null, `${data.city}: ${data.temp}°`));
      
      // Tool should be automatically built
      expect(tool.name).toBe('weather');
      expect(tool.inputSchema).toBeDefined();
    });
  });
  
  describe('Complex Tool Creation', () => {
    it('should create tool with client execution', () => {
      const tool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ results: [`Server: ${input.query}`] }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache?.get(input.query);
          return cached || { results: [`Client: ${input.query}`] };
        })
        .render(({ data }) => React.createElement('div', null, data.results.join(', ')));
      
      expect(tool.name).toBe('search');
      expect(tool.execute).toBeDefined();
      expect(tool.clientExecute).toBeDefined();
      expect(tool.render).toBeDefined();
    });
  });
  
  describe('Input Validation', () => {
    it('should validate input with Zod schema', async () => {
      const tool = aui
        .tool('validated')
        .input(z.object({ 
          email: z.string().email(),
          age: z.number().min(0) 
        }))
        .execute(async ({ input }) => `${input.email} is ${input.age} years old`)
        .render(({ data }) => React.createElement('div', null, data));
      
      const schema = tool.inputSchema;
      expect(schema).toBeDefined();
      
      // Valid input
      const validResult = schema?.safeParse({ email: 'test@example.com', age: 25 });
      expect(validResult?.success).toBe(true);
      
      // Invalid input
      const invalidResult = schema?.safeParse({ email: 'not-an-email', age: -5 });
      expect(invalidResult?.success).toBe(false);
    });
  });
  
  describe('Execution', () => {
    it('should execute server handler', async () => {
      const tool = aui
        .tool('server-test')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => input.value * 2)
        .render(({ data }) => React.createElement('div', null, data));
      
      const result = await tool.execute({ input: { value: 21 } });
      expect(result).toBe(42);
    });
    
    it('should execute client handler when available', async () => {
      const tool = aui
        .tool('client-test')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => input.value * 2)
        .clientExecute(async ({ input, ctx }) => input.value * 3)
        .render(({ data }) => React.createElement('div', null, data));
      
      const clientResult = await tool.clientExecute!({ 
        input: { value: 10 }, 
        ctx: { cache: new Map() } 
      });
      expect(clientResult).toBe(30);
    });
  });
  
  describe('Rendering', () => {
    it('should render with data', () => {
      const tool = aui
        .tool('render-test')
        .execute(async () => 'Test Data')
        .render(({ data }) => React.createElement('div', null, data));
      
      const rendered = tool.render!({ 
        data: 'Test Data', 
        input: {} 
      });
      
      expect(rendered.type).toBe('div');
      expect(rendered.props.children).toBe('Test Data');
    });
    
    it('should render with data and input', () => {
      const tool = aui
        .tool('render-with-input')
        .input(z.object({ prefix: z.string() }))
        .execute(async ({ input }) => 'World')
        .render(({ data, input }) => 
          React.createElement('div', null, `${input.prefix}: ${data}`)
        );
      
      const rendered = tool.render!({ 
        data: 'World', 
        input: { prefix: 'Hello' } 
      });
      
      expect(rendered.props.children).toBe('Hello: World');
    });
  });
  
  describe('Short Alias', () => {
    it('should work with .t() alias', () => {
      const tool = aui
        .t('alias-test')
        .execute(async () => 'Using alias!')
        .render(({ data }) => React.createElement('span', null, data));
      
      expect(tool.name).toBe('alias-test');
      expect(tool.execute).toBeDefined();
      expect(tool.render).toBeDefined();
    });
  });
  
  describe('Edge Cases', () => {
    it('should work without input schema', async () => {
      const tool = aui
        .tool('no-input')
        .execute(async () => 'No input needed')
        .render(({ data }) => React.createElement('div', null, data));
      
      const result = await tool.execute({ input: undefined as any });
      expect(result).toBe('No input needed');
    });
    
    it('should handle different parameter styles', async () => {
      // Style 1: Destructured with type
      const tool1 = aui
        .tool('style1')
        .execute(async ({ input }: { input: { x: number } }) => input.x * 2)
        .render(({ data }) => React.createElement('div', null, data));
      
      // Style 2: Direct input parameter
      const tool2 = aui
        .tool('style2')
        .execute(async (input: { x: number }) => input.x * 3)
        .render(({ data }) => React.createElement('div', null, data));
      
      const result1 = await tool1.execute({ input: { x: 10 } });
      const result2 = await tool2.execute({ input: { x: 10 } });
      
      expect(result1).toBe(20);
      expect(result2).toBe(30);
    });
  });
});
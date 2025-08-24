/**
 * Lantos AUI Examples - Clean, concise tool definitions
 */

import React from 'react';
import { aui, z } from '../lantos-refined';

// -----------------------------------------------------------------------------
// SIMPLE TOOL - Just 2 methods (input + execute)
// -----------------------------------------------------------------------------

export const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// -----------------------------------------------------------------------------
// COMPLEX TOOL - With client optimization
// -----------------------------------------------------------------------------

export const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server: database search
    const results = await fetch(`/api/search?q=${input.query}`).then(r => r.json());
    return { results };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client: check cache first, then fetch
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify(input) 
    });
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <div className="search-results">
      {data.results.map((item: any, i: number) => (
        <div key={i}>{item}</div>
      ))}
    </div>
  ))
  .build();

// -----------------------------------------------------------------------------
// MORE EXAMPLES
// -----------------------------------------------------------------------------

// Calculator - pure function
export const calculator = aui
  .tool('calc')
  .input(z.object({
    a: z.number(),
    b: z.number(),
    op: z.enum(['+', '-', '*', '/'])
  }))
  .execute(({ input }) => {
    const { a, b, op } = input;
    const result = {
      '+': a + b,
      '-': a - b,
      '*': a * b,
      '/': a / b
    }[op];
    return { result };
  })
  .render(({ data }) => <span>{data.result}</span>)
  .build();

// Database query tool
export const dbQuery = aui
  .tool('db')
  .input(z.object({
    collection: z.string(),
    operation: z.enum(['find', 'create', 'update', 'delete']),
    filter: z.record(z.any()).optional(),
    data: z.record(z.any()).optional()
  }))
  .execute(async ({ input }) => {
    // Server-side database operation
    const { collection, operation, filter, data } = input;
    
    switch (operation) {
      case 'find':
        return { items: [] }; // Mock data
      case 'create':
        return { id: Date.now(), ...data };
      case 'update':
        return { modified: 1 };
      case 'delete':
        return { deleted: 1 };
    }
  })
  .build();

// UI Control tool for AI to manipulate frontend
export const uiControl = aui
  .tool('ui')
  .input(z.object({
    action: z.enum(['show', 'hide', 'update', 'click']),
    selector: z.string(),
    value: z.any().optional()
  }))
  .clientExecute(({ input }) => {
    const element = document.querySelector(input.selector) as HTMLElement;
    if (!element) return { error: 'Element not found' };

    switch (input.action) {
      case 'show':
        element.style.display = 'block';
        break;
      case 'hide':
        element.style.display = 'none';
        break;
      case 'update':
        if ('value' in element) {
          (element as any).value = input.value;
        } else {
          element.textContent = String(input.value);
        }
        break;
      case 'click':
        element.click();
        break;
    }

    return { success: true };
  })
  .build();

// Form submission tool
export const formSubmit = aui
  .tool('form')
  .input(z.object({
    formId: z.string(),
    data: z.record(z.any())
  }))
  .clientExecute(async ({ input, ctx }) => {
    const response = await ctx.fetch('/api/form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input.data)
    });
    return response;
  })
  .render(({ data }) => (
    <div className="form-result">
      {data.success ? '✅ Submitted' : '❌ Failed'}
    </div>
  ))
  .build();

// File upload tool
export const fileUpload = aui
  .tool('upload')
  .input(z.object({
    file: z.string(), // base64 or url
    filename: z.string(),
    type: z.string()
  }))
  .execute(async ({ input }) => {
    // Server: save file
    return { 
      url: `/uploads/${Date.now()}-${input.filename}`,
      size: input.file.length 
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    const formData = new FormData();
    formData.append('file', input.file);
    formData.append('filename', input.filename);
    
    return ctx.fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
  })
  .render(({ data }) => (
    <div className="upload-result">
      <a href={data.url}>{data.url}</a>
      <span>({data.size} bytes)</span>
    </div>
  ))
  .build();

// Chat/messaging tool
export const chat = aui
  .tool('chat')
  .input(z.object({
    message: z.string(),
    conversationId: z.string().optional()
  }))
  .execute(async ({ input }) => {
    // Server: process message, could integrate with AI
    return {
      response: `Echo: ${input.message}`,
      conversationId: input.conversationId || Date.now().toString()
    };
  })
  .render(({ data }) => (
    <div className="chat-message">
      <div className="response">{data.response}</div>
      <small>Conversation: {data.conversationId}</small>
    </div>
  ))
  .build();

// Register all tools
[
  weatherTool,
  searchTool,
  calculator,
  dbQuery,
  uiControl,
  formSubmit,
  fileUpload,
  chat
].forEach(tool => aui.register(tool));

// Export for AI usage
export const allTools = aui.getTools();

// Helper for AI to execute tools
export async function executeToolForAI(name: string, input: any) {
  return aui.execute(name, input);
}
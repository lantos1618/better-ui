'use client';

import React from 'react';
import aui, { z } from './lantos-ultra';
import { createServerTool } from './server';
import { createClientTool } from './client';

// Database query tool with caching
export const databaseTool = createClientTool(
  'database',
  z.object({
    query: z.string(),
    params: z.record(z.any()).optional()
  }),
  async ({ input }) => {
    // Simulate database query
    await new Promise(r => setTimeout(r, 300));
    return {
      rows: [
        { id: 1, name: 'Item 1', created: new Date().toISOString() },
        { id: 2, name: 'Item 2', created: new Date().toISOString() }
      ],
      count: 2,
      query: input.query
    };
  },
  {
    cacheKey: (input) => `db:${input.query}:${JSON.stringify(input.params)}`,
    cacheTTL: 60000, // 1 minute
    retries: 2,
    timeout: 5000
  }
);

// File upload tool
export const fileUploadTool = aui
  .tool('fileUpload')
  .input(z.object({
    file: z.instanceof(File),
    path: z.string()
  }))
  .execute(async ({ input }) => {
    const formData = new FormData();
    formData.append('file', input.file);
    formData.append('path', input.path);
    
    // Simulate upload
    await new Promise(r => setTimeout(r, 1000));
    
    return {
      url: `/uploads/${input.path}/${input.file.name}`,
      size: input.file.size,
      type: input.file.type
    };
  })
  .render(({ data }) => (
    <div className="p-4 bg-green-100 rounded">
      <p>File uploaded successfully!</p>
      <p className="text-sm">URL: {data.url}</p>
      <p className="text-sm">Size: {(data.size / 1024).toFixed(2)} KB</p>
    </div>
  ));

// Email notification tool
export const emailTool = createServerTool(
  'sendEmail',
  z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
    html: z.boolean().optional()
  }),
  async ({ input }) => {
    // Simulate sending email
    console.log('Sending email to:', input.to);
    await new Promise(r => setTimeout(r, 500));
    
    return {
      messageId: `msg_${Date.now()}`,
      sentAt: new Date().toISOString(),
      recipient: input.to
    };
  },
  {
    requireAuth: true,
    rateLimit: { requests: 10, window: 60000 }
  }
);

// AI text generation tool
export const aiTextTool = aui
  .tool('generateText')
  .input(z.object({
    prompt: z.string(),
    maxTokens: z.number().default(100),
    temperature: z.number().min(0).max(2).default(0.7)
  }))
  .execute(async ({ input }) => {
    // Simulate AI API call
    await new Promise(r => setTimeout(r, 1500));
    
    return {
      text: `Generated response for: "${input.prompt}". This is a simulated AI response with temperature ${input.temperature}.`,
      tokens: Math.floor(Math.random() * input.maxTokens),
      model: 'gpt-4'
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    const cacheKey = `ai:${input.prompt}:${input.temperature}`;
    const cached = ctx.cache.get(cacheKey);
    if (cached) return cached;
    
    // Call API
    const response = await ctx.fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    const result = await response.json();
    ctx.cache.set(cacheKey, result);
    return result;
  })
  .render(({ data, loading }) => (
    <div className="p-4 bg-purple-100 rounded">
      {loading ? (
        <p>Generating text...</p>
      ) : (
        <>
          <p className="font-medium">{data.text}</p>
          <p className="text-sm text-gray-600 mt-2">
            Tokens: {data.tokens} | Model: {data.model}
          </p>
        </>
      )}
    </div>
  ));

// Analytics tracking tool
export const analyticsTool = aui
  .tool('trackEvent')
  .input(z.object({
    event: z.string(),
    properties: z.record(z.any()).optional(),
    userId: z.string().optional()
  }))
  .execute(async ({ input, ctx }) => {
    const eventId = `evt_${Date.now()}`;
    
    // Store in context for session tracking
    if (!ctx?.cache.has('events')) {
      ctx?.cache.set('events', []);
    }
    const events = ctx?.cache.get('events') || [];
    events.push({
      id: eventId,
      ...input,
      timestamp: Date.now()
    });
    ctx?.cache.set('events', events);
    
    return {
      eventId,
      tracked: true,
      sessionEvents: events.length
    };
  });

// Form validation tool
export const formValidationTool = aui
  .tool('validateForm')
  .input(z.object({
    fields: z.record(z.any()),
    rules: z.record(z.object({
      required: z.boolean().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      custom: z.function().optional()
    }))
  }))
  .execute(({ input }) => {
    const errors: Record<string, string[]> = {};
    const valid: Record<string, boolean> = {};
    
    for (const [field, value] of Object.entries(input.fields)) {
      const fieldRules = input.rules[field];
      if (!fieldRules) continue;
      
      const fieldErrors: string[] = [];
      
      if (fieldRules.required && !value) {
        fieldErrors.push(`${field} is required`);
      }
      
      if (fieldRules.min && typeof value === 'string' && value.length < fieldRules.min) {
        fieldErrors.push(`${field} must be at least ${fieldRules.min} characters`);
      }
      
      if (fieldRules.max && typeof value === 'string' && value.length > fieldRules.max) {
        fieldErrors.push(`${field} must be at most ${fieldRules.max} characters`);
      }
      
      if (fieldRules.pattern && typeof value === 'string') {
        const regex = new RegExp(fieldRules.pattern);
        if (!regex.test(value)) {
          fieldErrors.push(`${field} format is invalid`);
        }
      }
      
      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
        valid[field] = false;
      } else {
        valid[field] = true;
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      valid
    };
  })
  .render(({ data }) => (
    <div className={`p-4 rounded ${data.isValid ? 'bg-green-100' : 'bg-red-100'}`}>
      {data.isValid ? (
        <p className="text-green-700">✓ Form is valid</p>
      ) : (
        <div>
          <p className="text-red-700 font-medium">Form has errors:</p>
          <ul className="mt-2 text-sm">
            {Object.entries(data.errors).map(([field, errors]) => (
              <li key={field} className="text-red-600">
                {field}: {(errors as string[]).join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  ));

// Export all tools
export const tools = {
  database: databaseTool,
  fileUpload: fileUploadTool,
  email: emailTool,
  aiText: aiTextTool,
  analytics: analyticsTool,
  formValidation: formValidationTool
};
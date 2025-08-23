import React from 'react';
import aui, { z, defineTool } from '../index';

/**
 * AI Control Tools - Enable AI assistants to control frontend and backend
 * These tools demonstrate how AI can interact with both client and server
 */

// Frontend Control Tool - AI can manipulate UI elements
const uiControlTool = defineTool('ui-control', {
  input: z.object({
    action: z.enum(['show', 'hide', 'toggle', 'update']),
    elementId: z.string(),
    data: z.any().optional()
  }),
  execute: async (input) => {
    // Server-side validation
    console.log('UI Control request:', input);
    return {
      action: input.action,
      elementId: input.elementId,
      timestamp: Date.now(),
      data: input.data
    };
  },
  client: async (input, ctx) => {
    // Client-side DOM manipulation
    const element = document.getElementById(input.elementId);
    if (!element) throw new Error(`Element ${input.elementId} not found`);
    
    switch (input.action) {
      case 'show':
        element.style.display = 'block';
        break;
      case 'hide':
        element.style.display = 'none';
        break;
      case 'toggle':
        element.style.display = element.style.display === 'none' ? 'block' : 'none';
        break;
      case 'update':
        if (input.data?.innerHTML) element.innerHTML = input.data.innerHTML;
        if (input.data?.className) element.className = input.data.className;
        if (input.data?.style) Object.assign(element.style, input.data.style);
        break;
    }
    
    return {
      action: input.action,
      elementId: input.elementId,
      success: true,
      timestamp: Date.now()
    };
  },
  render: (result) => (
    <div className="ui-control-result">
      ✓ {result.action} on #{result.elementId} completed
    </div>
  )
});

// Backend Control Tool - AI can execute server operations
const backendControlTool = defineTool('backend-control', {
  input: z.object({
    service: z.enum(['database', 'cache', 'queue', 'storage']),
    operation: z.string(),
    params: z.record(z.any())
  }),
  execute: async (input) => {
    // This runs on the server, AI can control backend services
    switch (input.service) {
      case 'database':
        // Mock database operations
        console.log('DB Operation:', input.operation, input.params);
        return { 
          service: 'database',
          result: `Executed ${input.operation} on database`,
          rowsAffected: Math.floor(Math.random() * 100)
        };
      
      case 'cache':
        // Mock cache operations
        console.log('Cache Operation:', input.operation, input.params);
        return {
          service: 'cache',
          result: `Cache ${input.operation} completed`,
          keys: Object.keys(input.params)
        };
      
      case 'queue':
        // Mock queue operations
        console.log('Queue Operation:', input.operation, input.params);
        return {
          service: 'queue',
          result: `Message queued for ${input.operation}`,
          queueLength: Math.floor(Math.random() * 50)
        };
      
      case 'storage':
        // Mock storage operations
        console.log('Storage Operation:', input.operation, input.params);
        return {
          service: 'storage',
          result: `File ${input.operation} completed`,
          size: Math.floor(Math.random() * 1000000)
        };
    }
  },
  render: (result) => (
    <div className="backend-result">
      <h4>{result.service} Operation</h4>
      <p>{result.result}</p>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </div>
  )
});

// Navigation Control - AI can navigate the app
const navigationTool = defineTool('navigate', {
  input: z.object({
    path: z.string(),
    params: z.record(z.string()).optional(),
    method: z.enum(['push', 'replace', 'back', 'forward']).default('push')
  }),
  execute: async (input) => {
    return {
      navigated: true,
      path: input.path,
      method: input.method,
      timestamp: Date.now()
    };
  },
  client: async (input, ctx) => {
    // Client-side navigation using Next.js router
    if (typeof window !== 'undefined') {
      const url = new URL(input.path, window.location.origin);
      
      if (input.params) {
        Object.entries(input.params).forEach(([key, value]) => {
          url.searchParams.set(key, value);
        });
      }
      
      switch (input.method) {
        case 'push':
          window.history.pushState({}, '', url.toString());
          break;
        case 'replace':
          window.history.replaceState({}, '', url.toString());
          break;
        case 'back':
          window.history.back();
          break;
        case 'forward':
          window.history.forward();
          break;
      }
    }
    
    return {
      navigated: true,
      path: input.path,
      method: input.method,
      timestamp: Date.now()
    };
  },
  render: (result) => (
    <div className="navigation-result">
      📍 Navigated to {result.path} via {result.method}
    </div>
  )
});

// Form Control - AI can fill and submit forms
const formControlTool = defineTool('form-control', {
  input: z.object({
    formId: z.string(),
    action: z.enum(['fill', 'submit', 'reset', 'validate']),
    fields: z.record(z.any()).optional()
  }),
  execute: async (input) => {
    // Server-side form validation
    if (input.action === 'validate' && input.fields) {
      const errors: Record<string, string> = {};
      
      // Mock validation
      Object.entries(input.fields).forEach(([key, value]) => {
        if (typeof value === 'string' && value.length < 3) {
          errors[key] = 'Too short';
        }
      });
      
      return {
        valid: Object.keys(errors).length === 0,
        errors,
        formId: input.formId
      };
    }
    
    return {
      action: input.action,
      formId: input.formId,
      success: true
    };
  },
  client: async (input, ctx) => {
    const form = document.getElementById(input.formId) as HTMLFormElement;
    if (!form) throw new Error(`Form ${input.formId} not found`);
    
    switch (input.action) {
      case 'fill':
        if (input.fields) {
          Object.entries(input.fields).forEach(([name, value]) => {
            const field = form.elements.namedItem(name) as HTMLInputElement;
            if (field) field.value = String(value);
          });
        }
        break;
      
      case 'submit':
        form.submit();
        break;
      
      case 'reset':
        form.reset();
        break;
    }
    
    return {
      action: input.action,
      formId: input.formId,
      success: true
    };
  },
  render: (result) => (
    <div className="form-control-result">
      {result.action === 'validate' ? (
        result.valid ? (
          <span className="valid">✓ Form is valid</span>
        ) : (
          <div className="errors">
            {Object.entries(result.errors || {}).map(([field, error]) => (
              <div key={field}>{field}: {error}</div>
            ))}
          </div>
        )
      ) : (
        <span>Form {result.action} completed</span>
      )}
    </div>
  )
});

// API Call Tool - AI can make API calls
const apiCallTool = defineTool('api-call', {
  input: z.object({
    endpoint: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
    auth: z.object({
      type: z.enum(['bearer', 'basic', 'api-key']),
      credentials: z.string()
    }).optional()
  }),
  execute: async (input) => {
    // Server-side API call with authentication
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...input.headers
    };
    
    if (input.auth) {
      switch (input.auth.type) {
        case 'bearer':
          headers['Authorization'] = `Bearer ${input.auth.credentials}`;
          break;
        case 'basic':
          headers['Authorization'] = `Basic ${input.auth.credentials}`;
          break;
        case 'api-key':
          headers['X-API-Key'] = input.auth.credentials;
          break;
      }
    }
    
    try {
      const response = await fetch(input.endpoint, {
        method: input.method,
        headers,
        body: input.body ? JSON.stringify(input.body) : undefined
      });
      
      const data = await response.json();
      
      return {
        status: response.status,
        statusText: response.statusText,
        data,
        success: response.ok
      };
    } catch (error) {
      return {
        status: 0,
        statusText: 'Network Error',
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      };
    }
  },
  render: (result) => (
    <div className={`api-result ${result.success ? 'success' : 'error'}`}>
      <div className="status">
        {result.status} {result.statusText}
      </div>
      <pre className="data">
        {JSON.stringify(result.data || result.error, null, 2)}
      </pre>
    </div>
  )
});

// State Management Tool - AI can manage application state
const stateManagementTool = defineTool('state-manage', {
  input: z.object({
    action: z.enum(['set', 'get', 'update', 'delete', 'clear']),
    key: z.string().optional(),
    value: z.any().optional(),
    namespace: z.string().default('global')
  }),
  execute: async (input) => {
    // Server-side state tracking
    return {
      action: input.action,
      namespace: input.namespace,
      key: input.key,
      timestamp: Date.now()
    };
  },
  client: async (input, ctx) => {
    // Client-side state management
    const stateKey = `${input.namespace}:${input.key || ''}`;
    
    switch (input.action) {
      case 'set':
        if (input.key && input.value !== undefined) {
          localStorage.setItem(stateKey, JSON.stringify(input.value));
          ctx.cache.set(stateKey, input.value);
        }
        break;
      
      case 'get':
        if (input.key) {
          const cached = ctx.cache.get(stateKey);
          if (cached) return { value: cached };
          
          const stored = localStorage.getItem(stateKey);
          if (stored) {
            const value = JSON.parse(stored);
            ctx.cache.set(stateKey, value);
            return { value };
          }
        }
        break;
      
      case 'update':
        if (input.key && input.value !== undefined) {
          const existing = ctx.cache.get(stateKey) || 
                          JSON.parse(localStorage.getItem(stateKey) || '{}');
          const updated = { ...existing, ...input.value };
          localStorage.setItem(stateKey, JSON.stringify(updated));
          ctx.cache.set(stateKey, updated);
          return { value: updated };
        }
        break;
      
      case 'delete':
        if (input.key) {
          localStorage.removeItem(stateKey);
          ctx.cache.delete(stateKey);
        }
        break;
      
      case 'clear':
        if (input.namespace === 'global') {
          localStorage.clear();
          ctx.cache.clear();
        } else {
          // Clear namespace
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key?.startsWith(`${input.namespace}:`)) {
              localStorage.removeItem(key);
            }
          }
        }
        break;
    }
    
    return {
      action: input.action,
      namespace: input.namespace,
      key: input.key,
      success: true
    };
  },
  render: (result) => (
    <div className="state-result">
      State {result.action} {result.key ? `for ${result.key}` : ''} completed
      {result.value && (
        <pre>{JSON.stringify(result.value, null, 2)}</pre>
      )}
    </div>
  )
});

// Export all AI control tools
export const aiControlTools = {
  uiControl: uiControlTool,
  backendControl: backendControlTool,
  navigation: navigationTool,
  formControl: formControlTool,
  apiCall: apiCallTool,
  stateManagement: stateManagementTool
};

// Register all tools
Object.values(aiControlTools).forEach(tool => aui.register(tool));

export default aiControlTools;
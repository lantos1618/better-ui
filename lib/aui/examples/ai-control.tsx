import React from 'react';
import aui, { z } from '../index';

// AI Control Examples - Ultra-concise patterns for AI to control frontend/backend

// 1. Simplest possible form - just a function
const simplestTool = aui.do('simplest', async (input: string) => input.toUpperCase());

// 2. With input validation - still one line
const validatedTool = aui.do('validated', {
  input: z.object({ text: z.string().min(1) }),
  execute: async (input) => ({ result: input.text.length })
});

// 3. AI-optimized with retry logic
const reliableTool = aui.ai('reliable', {
  input: z.object({ url: z.string().url() }),
  execute: async (input) => {
    const response = await fetch(input.url);
    return response.json();
  },
  retry: 5,  // Will retry up to 5 times with exponential backoff
  timeout: 10000,  // 10 second timeout
  cache: true  // Enable caching
});

// 4. Frontend control tool
const uiControlTool = aui.ai('ui-control', {
  input: z.object({ 
    action: z.enum(['show', 'hide', 'toggle']),
    element: z.string() 
  }),
  client: async (input, ctx) => {
    // This runs on the client side
    const element = document.getElementById(input.element);
    if (element) {
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
      }
    }
    return { success: true, action: input.action, element: input.element };
  },
  execute: async (input) => {
    // Server-side fallback
    console.log('UI Control:', input);
    return { success: true, action: input.action, element: input.element };
  },
  render: (data) => (
    <div className="ui-control-result">
      {data.success ? '✓' : '✗'} {data.action} on {data.element}
    </div>
  )
});

// 5. Backend control tool
const dbControlTool = aui.ai('db-control', {
  input: z.object({
    query: z.string(),
    params: z.array(z.any()).optional()
  }),
  execute: async (input) => {
    // This only runs on the server for security
    console.log('Executing query:', input.query);
    // In real app, this would connect to database
    return { 
      rows: [], 
      affected: 0,
      query: input.query 
    };
  },
  render: (data) => (
    <div className="db-result">
      Query executed: {data.query}
      Rows affected: {data.affected}
    </div>
  )
});

// 6. State management tool
const stateTool = aui.ai('state', {
  input: z.object({
    key: z.string(),
    value: z.any(),
    operation: z.enum(['set', 'get', 'delete', 'clear'])
  }),
  client: async (input, ctx) => {
    switch (input.operation) {
      case 'set':
        localStorage.setItem(input.key, JSON.stringify(input.value));
        return { success: true, key: input.key, value: input.value };
      case 'get':
        const value = localStorage.getItem(input.key);
        return { success: true, key: input.key, value: value ? JSON.parse(value) : null };
      case 'delete':
        localStorage.removeItem(input.key);
        return { success: true, key: input.key };
      case 'clear':
        localStorage.clear();
        return { success: true };
    }
  },
  execute: async (input) => {
    // Server-side state management
    return { success: true, operation: input.operation };
  }
});

// 7. Navigation control
const navigationTool = aui.ai('navigate', {
  input: z.object({
    to: z.string(),
    type: z.enum(['push', 'replace', 'back', 'forward']).optional()
  }),
  client: async (input, ctx) => {
    switch (input.type || 'push') {
      case 'push':
        window.history.pushState({}, '', input.to);
        break;
      case 'replace':
        window.history.replaceState({}, '', input.to);
        break;
      case 'back':
        window.history.back();
        break;
      case 'forward':
        window.history.forward();
        break;
    }
    return { navigated: true, to: input.to };
  },
  execute: async (input) => ({ navigated: false, to: input.to })
});

// 8. Batch AI tools for complete app control
const aiControlSuite = aui.aiTools({
  click: {
    input: z.object({ selector: z.string() }),
    client: async (input) => {
      const element = document.querySelector(input.selector) as HTMLElement;
      element?.click();
      return { clicked: true, selector: input.selector };
    },
    execute: async (input) => ({ clicked: false, selector: input.selector })
  },
  
  type: {
    input: z.object({ selector: z.string(), text: z.string() }),
    client: async (input) => {
      const element = document.querySelector(input.selector) as HTMLInputElement;
      if (element) {
        element.value = input.text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return { typed: true, selector: input.selector, text: input.text };
    },
    execute: async (input) => ({ typed: false, selector: input.selector, text: input.text })
  },
  
  scroll: {
    input: z.object({ x: z.number().optional(), y: z.number().optional() }),
    client: async (input) => {
      window.scrollTo(input.x || 0, input.y || 0);
      return { scrolled: true, x: input.x || 0, y: input.y || 0 };
    },
    execute: async (input) => ({ scrolled: false, x: input.x || 0, y: input.y || 0 })
  },
  
  screenshot: {
    input: z.object({ selector: z.string().optional() }),
    client: async (input) => {
      // In real app, would use html2canvas or similar
      return { captured: true, selector: input.selector || 'body' };
    },
    execute: async (input) => ({ captured: false, selector: input.selector || 'body' })
  }
});

// 9. Ultra-short single character syntax
const ultraShort = aui.t('ultra')
  .i(z.object({ n: z.number() }))
  .e(async (i) => i.n * 2)
  .r((d) => <div>{d}</div>)
  .b();

// 10. Enable AI mode globally for all tools
aui.setAIMode(true, {
  retry: 3,
  timeout: 5000,
  cache: true
});

// Export all tools
export {
  simplestTool,
  validatedTool,
  reliableTool,
  uiControlTool,
  dbControlTool,
  stateTool,
  navigationTool,
  aiControlSuite,
  ultraShort
};
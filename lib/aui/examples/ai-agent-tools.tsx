import React from 'react';
import aui from '../index';
import { z } from 'zod';

// AI Agent Tool Suite - Enable AI to control both frontend and backend

// 1. Frontend Control Tools

const domManipulationTool = aui
  .tool('dom-manipulation')
  .input(z.object({
    selector: z.string(),
    action: z.enum(['click', 'focus', 'scroll', 'type', 'clear']),
    value: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    const element = document.querySelector(input.selector) as HTMLElement;
    if (!element) throw new Error(`Element not found: ${input.selector}`);
    
    switch (input.action) {
      case 'click':
        element.click();
        break;
      case 'focus':
        element.focus();
        break;
      case 'scroll':
        element.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'type':
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.value = input.value || '';
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
        break;
      case 'clear':
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.value = '';
        }
        break;
    }
    
    return { success: true, action: input.action, selector: input.selector };
  })
  .render(({ data }) => (
    <span className="text-green-600 text-sm">
      ✓ {data.action} on {data.selector}
    </span>
  ));

const styleModificationTool = aui
  .tool('style-modification')
  .input(z.object({
    selector: z.string(),
    styles: z.record(z.string())
  }))
  .clientExecute(async ({ input }) => {
    const elements = document.querySelectorAll(input.selector);
    elements.forEach((el) => {
      Object.assign((el as HTMLElement).style, input.styles);
    });
    return { modified: elements.length, selector: input.selector };
  })
  .render(({ data }) => (
    <div className="text-sm">
      Modified {data.modified} element(s) matching {data.selector}
    </div>
  ));

const navigationTool = aui
  .tool('navigation')
  .input(z.object({
    action: z.enum(['goto', 'back', 'forward', 'reload']),
    url: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    switch (input.action) {
      case 'goto':
        if (input.url) window.location.href = input.url;
        break;
      case 'back':
        window.history.back();
        break;
      case 'forward':
        window.history.forward();
        break;
      case 'reload':
        window.location.reload();
        break;
    }
    return { action: input.action, url: input.url };
  })
  .render(({ data }) => (
    <div>Navigating: {data.action} {data.url}</div>
  ));

// 2. Backend Control Tools

const apiRequestTool = aui
  .tool('api-request')
  .input(z.object({
    endpoint: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    body: z.any().optional(),
    headers: z.record(z.string()).optional()
  }))
  .execute(async ({ input }) => {
    const response = await fetch(input.endpoint, {
      method: input.method,
      headers: {
        'Content-Type': 'application/json',
        ...input.headers
      },
      body: input.body ? JSON.stringify(input.body) : undefined
    });
    
    const data = await response.json();
    return { status: response.status, data };
  })
  .render(({ data }) => (
    <div className="font-mono text-sm">
      <div>Status: {data.status}</div>
      <pre className="bg-gray-100 p-2 rounded mt-2">
        {JSON.stringify(data.data, null, 2)}
      </pre>
    </div>
  ));

const databaseQueryTool = aui
  .tool('database-query')
  .input(z.object({
    query: z.string(),
    params: z.array(z.any()).optional(),
    type: z.enum(['select', 'insert', 'update', 'delete'])
  }))
  .execute(async ({ input }) => {
    // In production, this would execute real database queries
    // For demo, return mock data based on query type
    switch (input.type) {
      case 'select':
        return {
          rows: [
            { id: 1, name: 'Item 1', created: new Date().toISOString() },
            { id: 2, name: 'Item 2', created: new Date().toISOString() }
          ],
          count: 2
        };
      case 'insert':
        return { inserted: 1, id: Math.floor(Math.random() * 1000) };
      case 'update':
        return { updated: 1 };
      case 'delete':
        return { deleted: 1 };
    }
  })
  .render(({ data }) => (
    <div className="space-y-2">
      <div className="font-semibold">Query Result:</div>
      <pre className="bg-gray-900 text-green-400 p-3 rounded">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  ));

const fileSystemTool = aui
  .tool('file-system')
  .input(z.object({
    operation: z.enum(['read', 'write', 'delete', 'list']),
    path: z.string(),
    content: z.string().optional()
  }))
  .execute(async ({ input }) => {
    // In production with proper server setup
    // This would interact with the file system
    switch (input.operation) {
      case 'read':
        return { content: `Contents of ${input.path}`, size: 1024 };
      case 'write':
        return { written: true, path: input.path, size: input.content?.length };
      case 'delete':
        return { deleted: true, path: input.path };
      case 'list':
        return {
          files: ['file1.txt', 'file2.js', 'config.json'],
          directories: ['src', 'lib', 'public']
        };
    }
  })
  .render(({ data }) => (
    <div className="bg-black text-green-400 p-3 rounded font-mono text-sm">
      {JSON.stringify(data, null, 2)}
    </div>
  ));

// 3. State Management Tools

const stateManagementTool = aui
  .tool('state-management')
  .input(z.object({
    action: z.enum(['get', 'set', 'update', 'delete']),
    key: z.string(),
    value: z.any().optional()
  }))
  .clientExecute(async ({ input, ctx }) => {
    const stateKey = `app_state_${input.key}`;
    
    switch (input.action) {
      case 'get':
        return ctx.cache.get(stateKey) || null;
      case 'set':
        ctx.cache.set(stateKey, input.value);
        return { set: true, key: input.key, value: input.value };
      case 'update':
        const current = ctx.cache.get(stateKey) || {};
        const updated = { ...current, ...input.value };
        ctx.cache.set(stateKey, updated);
        return { updated: true, key: input.key, value: updated };
      case 'delete':
        ctx.cache.delete(stateKey);
        return { deleted: true, key: input.key };
    }
  })
  .render(({ data }) => (
    <div className="text-sm">
      State operation: {JSON.stringify(data)}
    </div>
  ));

// 4. Workflow Orchestration Tool

const workflowTool = aui
  .tool('workflow')
  .input(z.object({
    steps: z.array(z.object({
      tool: z.string(),
      input: z.any(),
      waitForPrevious: z.boolean().optional()
    }))
  }))
  .execute(async ({ input, ctx }) => {
    const results = [];
    
    for (const step of input.steps) {
      if (step.waitForPrevious && results.length > 0) {
        // Wait for previous step if needed
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Execute the tool
      const tool = aui.get(step.tool);
      if (tool) {
        const result = await tool.run(step.input, ctx);
        results.push({ tool: step.tool, result });
      }
    }
    
    return { completed: results.length, results };
  })
  .render(({ data }) => (
    <div className="space-y-2">
      <div className="font-semibold">Workflow completed: {data.completed} steps</div>
      {data.results.map((result, i) => (
        <div key={i} className="pl-4 border-l-2 border-blue-400">
          Step {i + 1}: {result.tool}
        </div>
      ))}
    </div>
  ));

// 5. Analytics and Monitoring Tools

const analyticsTool = aui
  .tool('analytics')
  .input(z.object({
    event: z.string(),
    properties: z.record(z.any()).optional(),
    userId: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    // Track analytics event
    console.log('Analytics Event:', input);
    
    // In production, send to analytics service
    return {
      tracked: true,
      event: input.event,
      timestamp: new Date().toISOString()
    };
  })
  .render(({ data }) => (
    <div className="text-xs text-gray-600">
      📊 Event tracked: {data.event} at {data.timestamp}
    </div>
  ));

const performanceMonitorTool = aui
  .tool('performance-monitor')
  .input(z.object({
    metric: z.enum(['memory', 'cpu', 'network', 'fps']),
    duration: z.number().optional()
  }))
  .clientExecute(async ({ input }) => {
    const metrics: any = {};
    
    if (input.metric === 'memory' && 'memory' in performance) {
      const memory = (performance as any).memory;
      metrics.usedJSHeapSize = memory.usedJSHeapSize;
      metrics.totalJSHeapSize = memory.totalJSHeapSize;
    }
    
    if (input.metric === 'fps') {
      let frames = 0;
      const startTime = performance.now();
      const countFrame = () => {
        frames++;
        if (performance.now() - startTime < 1000) {
          requestAnimationFrame(countFrame);
        }
      };
      requestAnimationFrame(countFrame);
      await new Promise(resolve => setTimeout(resolve, 1000));
      metrics.fps = frames;
    }
    
    return { metric: input.metric, data: metrics };
  })
  .render(({ data }) => (
    <div className="font-mono text-sm">
      {data.metric}: {JSON.stringify(data.data)}
    </div>
  ));

// Export all AI agent tools
export const aiAgentTools = {
  // Frontend Control
  domManipulation: domManipulationTool,
  styleModification: styleModificationTool,
  navigation: navigationTool,
  
  // Backend Control
  apiRequest: apiRequestTool,
  databaseQuery: databaseQueryTool,
  fileSystem: fileSystemTool,
  
  // State Management
  stateManagement: stateManagementTool,
  
  // Orchestration
  workflow: workflowTool,
  
  // Monitoring
  analytics: analyticsTool,
  performanceMonitor: performanceMonitorTool
};

// Tool discovery for AI agents
export const toolManifest = {
  version: '1.0.0',
  tools: Object.entries(aiAgentTools).map(([key, tool]) => ({
    name: key,
    description: tool.description,
    schema: tool.schema,
    capabilities: {
      frontend: ['domManipulation', 'styleModification', 'navigation', 'stateManagement', 'analytics', 'performanceMonitor'].includes(key),
      backend: ['apiRequest', 'databaseQuery', 'fileSystem'].includes(key),
      orchestration: key === 'workflow'
    }
  }))
};

// Example AI agent workflow
export async function aiAgentExample() {
  // AI can orchestrate complex workflows
  const workflow = await workflowTool.run({
    steps: [
      {
        tool: 'dom-manipulation',
        input: { selector: '#search-input', action: 'type', value: 'AI search query' }
      },
      {
        tool: 'dom-manipulation',
        input: { selector: '#search-button', action: 'click' },
        waitForPrevious: true
      },
      {
        tool: 'api-request',
        input: { endpoint: '/api/search', method: 'POST', body: { query: 'AI search query' } },
        waitForPrevious: true
      },
      {
        tool: 'analytics',
        input: { event: 'search_performed', properties: { query: 'AI search query' } }
      }
    ]
  });
  
  return workflow;
}
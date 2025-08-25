'use client';

import React, { useState, useCallback } from 'react';
import aui, { useAUITool, AUIProvider } from '../index';
import { z } from 'zod';

// ===========================================
// AI-CONTROLLED TOOLS FOR FRONTEND & BACKEND
// ===========================================

// 1. UI Control Tool - AI can manipulate the UI
const uiControlTool = aui
  .tool('ui-control')
  .input(z.object({
    action: z.enum(['show', 'hide', 'toggle', 'update']),
    target: z.string(),
    value: z.any().optional()
  }))
  .execute(async ({ input }) => {
    return {
      action: input.action,
      target: input.target,
      value: input.value,
      timestamp: new Date().toISOString()
    };
  })
  .render(({ data }) => (
    <div className="p-2 bg-blue-50 rounded text-sm">
      UI Action: {data.action} on {data.target}
    </div>
  ));

// 2. Database Query Tool - AI can query backend data
const databaseTool = aui
  .tool('database')
  .input(z.object({
    table: z.string(),
    operation: z.enum(['select', 'insert', 'update', 'delete']),
    conditions: z.record(z.any()).optional(),
    data: z.record(z.any()).optional(),
    limit: z.number().optional()
  }))
  .execute(async ({ input }) => {
    // Server-side: actual database operations
    const mockData = {
      users: [
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Bob', role: 'user' }
      ],
      posts: [
        { id: 1, title: 'Hello World', authorId: 1 },
        { id: 2, title: 'AI is Amazing', authorId: 2 }
      ]
    };
    
    if (input.operation === 'select') {
      return mockData[input.table as keyof typeof mockData] || [];
    }
    
    return { success: true, operation: input.operation, table: input.table };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client optimization with caching
    const cacheKey = `db:${input.table}:${input.operation}`;
    
    if (input.operation === 'select') {
      const cached = ctx.cache.get(cacheKey);
      if (cached) return cached;
    }
    
    const result = await ctx.fetch('/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
    
    if (input.operation === 'select') {
      ctx.cache.set(cacheKey, result);
    }
    
    return result;
  })
  .render(({ data }) => (
    <div className="p-3 bg-green-50 rounded">
      <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
    </div>
  ));

// 3. API Integration Tool - AI can call external APIs
const apiTool = aui
  .tool('api-call')
  .input(z.object({
    endpoint: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    headers: z.record(z.string()).optional(),
    body: z.any().optional()
  }))
  .execute(async ({ input }) => {
    // Server-side: proxy API calls with auth
    const response = await fetch(input.endpoint, {
      method: input.method,
      headers: {
        'Content-Type': 'application/json',
        ...input.headers
      },
      body: input.body ? JSON.stringify(input.body) : undefined
    });
    
    return response.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: handle CORS and caching
    if (input.method === 'GET') {
      const cached = ctx.cache.get(input.endpoint);
      if (cached) return cached;
    }
    
    const result = await ctx.fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
    
    if (input.method === 'GET') {
      ctx.cache.set(input.endpoint, result);
    }
    
    return result;
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div>Calling API...</div>;
    if (error) return <div className="text-red-500">API Error: {error.message}</div>;
    
    return (
      <div className="p-3 bg-yellow-50 rounded">
        <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
      </div>
    );
  });

// 4. Form Generation Tool - AI can create dynamic forms
const formTool = aui
  .tool('form-generator')
  .input(z.object({
    fields: z.array(z.object({
      name: z.string(),
      type: z.enum(['text', 'number', 'email', 'select', 'checkbox']),
      label: z.string(),
      required: z.boolean().optional(),
      options: z.array(z.string()).optional()
    })),
    submitAction: z.string()
  }))
  .execute(async ({ input }) => {
    return {
      formId: crypto.randomUUID(),
      fields: input.fields,
      submitAction: input.submitAction,
      createdAt: new Date().toISOString()
    };
  })
  .render(({ data }) => (
    <form className="space-y-3 p-4 border rounded">
      {data.fields.map((field) => (
        <div key={field.name}>
          <label className="block text-sm font-medium mb-1">
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
          </label>
          {field.type === 'select' ? (
            <select className="w-full p-2 border rounded">
              {field.options?.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : field.type === 'checkbox' ? (
            <input type="checkbox" className="mr-2" />
          ) : (
            <input 
              type={field.type} 
              className="w-full p-2 border rounded"
              required={field.required}
            />
          )}
        </div>
      ))}
      <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
        {data.submitAction}
      </button>
    </form>
  ));

// 5. Workflow Automation Tool - AI can chain operations
const workflowTool = aui
  .tool('workflow')
  .input(z.object({
    steps: z.array(z.object({
      tool: z.string(),
      input: z.any(),
      dependsOn: z.string().optional()
    })),
    parallel: z.boolean().optional()
  }))
  .execute(async ({ input }) => {
    const results: any[] = [];
    
    for (const step of input.steps) {
      // Execute each step (would call actual tools)
      results.push({
        step: step.tool,
        result: `Executed ${step.tool}`,
        timestamp: new Date().toISOString()
      });
    }
    
    return {
      workflowId: crypto.randomUUID(),
      steps: results,
      completed: true
    };
  })
  .render(({ data }) => (
    <div className="space-y-2">
      <h3 className="font-semibold">Workflow Execution</h3>
      {data.steps?.map((step: any, i: number) => (
        <div key={i} className="p-2 bg-gray-50 rounded text-sm">
          ✓ {step.step} - {step.result}
        </div>
      ))}
    </div>
  ));

// ===========================================
// AI ASSISTANT COMPONENT
// ===========================================

interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tools?: Array<{ name: string; input: any; output?: any }>;
}

export function AIControlDemo() {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      role: 'system',
      content: 'I can control both frontend and backend operations using AUI tools.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Tool hooks
  const uiControl = useAUITool(uiControlTool);
  const database = useAUITool(databaseTool);
  const api = useAUITool(apiTool);
  const form = useAUITool(formTool);
  const workflow = useAUITool(workflowTool);

  const processAICommand = useCallback(async (command: string) => {
    setIsProcessing(true);
    
    // Parse AI intent and execute tools
    const lowerCommand = command.toLowerCase();
    const executedTools: Array<{ name: string; input: any; output?: any }> = [];
    
    try {
      // UI Control commands
      if (lowerCommand.includes('show') || lowerCommand.includes('hide')) {
        const result = await uiControl.execute({
          action: lowerCommand.includes('show') ? 'show' : 'hide',
          target: 'dashboard',
          value: null
        });
        executedTools.push({ name: 'ui-control', input: { action: 'show', target: 'dashboard' }, output: result });
      }
      
      // Database commands
      if (lowerCommand.includes('fetch') || lowerCommand.includes('get') || lowerCommand.includes('users')) {
        const result = await database.execute({
          table: 'users',
          operation: 'select',
          limit: 10
        });
        executedTools.push({ name: 'database', input: { table: 'users', operation: 'select' }, output: result });
      }
      
      // Form generation
      if (lowerCommand.includes('form') || lowerCommand.includes('create')) {
        const result = await form.execute({
          fields: [
            { name: 'name', type: 'text', label: 'Name', required: true },
            { name: 'email', type: 'email', label: 'Email', required: true },
            { name: 'role', type: 'select', label: 'Role', options: ['admin', 'user', 'guest'] }
          ],
          submitAction: 'Submit'
        });
        executedTools.push({ name: 'form-generator', input: { fields: [...] }, output: result });
      }
      
      // Workflow execution
      if (lowerCommand.includes('workflow') || lowerCommand.includes('automate')) {
        const result = await workflow.execute({
          steps: [
            { tool: 'database', input: { table: 'users', operation: 'select' } },
            { tool: 'api-call', input: { endpoint: '/api/process', method: 'POST' } },
            { tool: 'ui-control', input: { action: 'update', target: 'results' } }
          ],
          parallel: false
        });
        executedTools.push({ name: 'workflow', input: { steps: [...] }, output: result });
      }
      
      // Add assistant response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: executedTools.length > 0 
          ? `I've executed ${executedTools.length} tool(s) to fulfill your request.`
          : 'I can help you with UI control, database queries, API calls, form generation, and workflow automation. What would you like me to do?',
        tools: executedTools
      }]);
      
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, [uiControl, database, api, form, workflow]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    
    const userMessage = input;
    setInput('');
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    await processAICommand(userMessage);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">AI Control Demo</h1>
        <p className="text-gray-600">
          AI assistant that can control both frontend and backend operations
        </p>
      </div>

      {/* Chat Interface */}
      <div className="border rounded-lg overflow-hidden">
        <div className="h-96 overflow-y-auto p-4 bg-gray-50 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white'} rounded-lg p-3`}>
                <div className="text-sm font-medium mb-1">
                  {msg.role === 'user' ? 'You' : 'AI Assistant'}
                </div>
                <div className="text-sm">{msg.content}</div>
                
                {/* Tool Executions */}
                {msg.tools && msg.tools.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.tools.map((tool, j) => (
                      <div key={j} className="bg-gray-100 rounded p-2 text-xs">
                        <div className="font-semibold">🔧 {tool.name}</div>
                        {tool.output && (
                          <div className="mt-1">
                            {(() => {
                              const t = aui.get(tool.name);
                              return t?.renderer && t.renderer({ data: tool.output });
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-200 rounded-lg p-3 animate-pulse">
                <div className="text-sm">AI is thinking...</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4 bg-white border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Try: 'Show me all users', 'Create a contact form', 'Run a workflow'"
              className="flex-1 p-2 border rounded-lg"
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>

      {/* Available Tools Display */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Available Tools</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <div>📊 Database Queries</div>
          <div>🎨 UI Control</div>
          <div>🌐 API Calls</div>
          <div>📝 Form Generation</div>
          <div>⚙️ Workflow Automation</div>
          <div>🔄 Real-time Updates</div>
        </div>
      </div>
    </div>
  );
}

// Wrapper component with provider
export function AIControlDemoWithProvider() {
  return (
    <AUIProvider>
      <AIControlDemo />
    </AUIProvider>
  );
}

export default AIControlDemoWithProvider;
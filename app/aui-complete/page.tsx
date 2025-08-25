'use client';

import React, { useState, useEffect } from 'react';
import aui from '@/lib/aui';
import { 
  domClick, domType, domScroll, domGetText,
  apiGet, apiPost,
  stateSet, stateGet,
  navigate, getLocation,
  formFill, formSubmit,
  dataFetch, dataTransform,
  notifyToast, notifyProgress,
  fileUpload, fileDownload
} from '@/lib/aui';
import { z } from 'zod';

// Register all tools with the main AUI instance
const tools = [
  domClick, domType, domScroll, domGetText,
  apiGet, apiPost,
  stateSet, stateGet,
  navigate, getLocation,
  formFill, formSubmit,
  dataFetch, dataTransform,
  notifyToast, notifyProgress,
  fileUpload, fileDownload
];

// Example of AI-controlled workflow
const aiWorkflow = aui
  .tool('ai-workflow')
  .describe('AI-controlled workflow that can manipulate the entire UI')
  .input(z.object({
    task: z.enum(['fillForm', 'searchAndClick', 'extractData', 'automateProcess'])
  }))
  .clientExecute(async ({ input, ctx }) => {
    switch (input.task) {
      case 'fillForm':
        await formFill.run({
          formSelector: '#demo-form',
          values: {
            name: 'AI Assistant',
            email: 'ai@example.com',
            message: 'This form was filled by AI'
          }
        }, ctx);
        await notifyToast.run({
          message: 'Form filled by AI!',
          type: 'success'
        }, ctx);
        break;
        
      case 'searchAndClick':
        await domType.run({
          selector: '#search-box',
          text: 'AI controlled search',
          clear: true
        }, ctx);
        await domClick.run({
          selector: '#search-button',
          wait: 500
        }, ctx);
        break;
        
      case 'extractData':
        const pageText = await domGetText.run({
          selector: 'body',
          all: false
        }, ctx);
        await stateSet.run({
          key: 'extracted_data',
          value: pageText,
          persist: true
        }, ctx);
        break;
        
      case 'automateProcess':
        await notifyProgress.run({
          id: 'automation',
          value: 0,
          message: 'Starting automation...'
        }, ctx);
        
        for (let i = 1; i <= 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          await notifyProgress.run({
            id: 'automation',
            value: i * 20,
            message: `Processing step ${i} of 5...`
          }, ctx);
        }
        
        await notifyToast.run({
          message: 'Automation complete!',
          type: 'success',
          duration: 5000
        }, ctx);
        break;
    }
    
    return { task: input.task, completed: true };
  })
  .render(({ data }) => (
    <div className="p-4 bg-green-50 rounded">
      ✅ Task &quot;{data.task}&quot; completed successfully
    </div>
  ));

export default function AUIDemo() {
  const [activeDemo, setActiveDemo] = useState<string>('overview');
  const [results, setResults] = useState<any>({});

  const runAIWorkflow = async (task: string) => {
    const result = await aiWorkflow.run({ task: task as any });
    setResults(prev => ({ ...prev, [task]: result }));
  };

  const demos = {
    overview: (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">AUI System Overview</h2>
        <p className="text-lg text-gray-600">
          AUI (Assistant-UI) provides a comprehensive toolkit for AI agents to control 
          both frontend and backend operations in Next.js applications.
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded">
            <h3 className="font-bold mb-2">Frontend Control</h3>
            <ul className="text-sm space-y-1">
              <li>• DOM manipulation</li>
              <li>• Form interactions</li>
              <li>• Navigation control</li>
              <li>• State management</li>
              <li>• File operations</li>
            </ul>
          </div>
          
          <div className="p-4 bg-green-50 rounded">
            <h3 className="font-bold mb-2">Backend Control</h3>
            <ul className="text-sm space-y-1">
              <li>• API requests</li>
              <li>• Data fetching</li>
              <li>• Server actions</li>
              <li>• Database queries</li>
              <li>• File system access</li>
            </ul>
          </div>
        </div>
        
        <div className="p-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
          <h3 className="text-xl font-bold mb-4">Key Features</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <strong>🎯 Concise API</strong>
              <p>Chain methods directly without build steps</p>
            </div>
            <div>
              <strong>🔒 Permission Control</strong>
              <p>Fine-grained access control for AI agents</p>
            </div>
            <div>
              <strong>📊 Audit Logging</strong>
              <p>Track all AI operations for transparency</p>
            </div>
            <div>
              <strong>⚡ Client/Server Split</strong>
              <p>Optimize execution based on context</p>
            </div>
            <div>
              <strong>🎨 React Integration</strong>
              <p>Render results as React components</p>
            </div>
            <div>
              <strong>🔄 Real-time Updates</strong>
              <p>WebSocket and SSE support</p>
            </div>
          </div>
        </div>
      </div>
    ),
    
    domControl: (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">DOM Control Demo</h2>
        
        <div className="space-y-4">
          <div className="p-4 border rounded">
            <h3 className="font-bold mb-2">Test Elements</h3>
            <input 
              id="test-input" 
              type="text" 
              placeholder="AI will type here"
              className="w-full p-2 border rounded mb-2"
            />
            <button 
              id="test-button"
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              AI will click this
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={async () => {
                await domType.run({
                  selector: '#test-input',
                  text: 'Hello from AI!',
                  clear: true,
                  delay: 100
                });
              }}
              className="px-4 py-2 bg-green-500 text-white rounded"
            >
              AI Type Text
            </button>
            
            <button
              onClick={async () => {
                await domClick.run({
                  selector: '#test-button',
                  wait: 500
                });
              }}
              className="px-4 py-2 bg-purple-500 text-white rounded"
            >
              AI Click Button
            </button>
            
            <button
              onClick={async () => {
                await domScroll.run({
                  y: 500,
                  behavior: 'smooth'
                });
              }}
              className="px-4 py-2 bg-orange-500 text-white rounded"
            >
              AI Scroll Page
            </button>
          </div>
        </div>
      </div>
    ),
    
    formControl: (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Form Control Demo</h2>
        
        <form id="demo-form" className="space-y-4 p-4 border rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input name="name" type="text" className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input name="email" type="email" className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea name="message" className="w-full p-2 border rounded" rows={3} />
          </div>
        </form>
        
        <button
          onClick={() => runAIWorkflow('fillForm')}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg"
        >
          AI Fill Form
        </button>
        
        {results.fillForm && aiWorkflow.renderer && 
          aiWorkflow.renderer({ data: results.fillForm })}
      </div>
    ),
    
    dataOperations: (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Data Operations Demo</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded">
            <h3 className="font-bold mb-2">State Management</h3>
            <div className="space-y-2">
              <button
                onClick={async () => {
                  await stateSet.run({
                    key: 'demo_state',
                    value: { timestamp: Date.now(), data: 'AI controlled state' },
                    persist: true
                  });
                  await notifyToast.run({
                    message: 'State saved!',
                    type: 'success'
                  });
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded text-sm"
              >
                AI Set State
              </button>
              
              <button
                onClick={async () => {
                  const result = await stateGet.run({
                    key: 'demo_state',
                    fallback: null
                  });
                  await notifyToast.run({
                    message: `State: ${JSON.stringify(result.value)}`,
                    type: 'info',
                    duration: 5000
                  });
                }}
                className="px-4 py-2 bg-green-500 text-white rounded text-sm"
              >
                AI Get State
              </button>
            </div>
          </div>
          
          <div className="p-4 border rounded">
            <h3 className="font-bold mb-2">File Operations</h3>
            <div className="space-y-2">
              <button
                onClick={async () => {
                  const result = await fileUpload.run({
                    accept: '.txt,.json',
                    multiple: false
                  });
                  console.log('Uploaded:', result);
                }}
                className="px-4 py-2 bg-purple-500 text-white rounded text-sm"
              >
                AI Upload File
              </button>
              
              <button
                onClick={async () => {
                  await fileDownload.run({
                    content: 'This file was generated by AI',
                    filename: 'ai-generated.txt',
                    type: 'text/plain'
                  });
                }}
                className="px-4 py-2 bg-orange-500 text-white rounded text-sm"
              >
                AI Download File
              </button>
            </div>
          </div>
        </div>
      </div>
    ),
    
    automation: (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">AI Automation Demo</h2>
        
        <div className="p-6 bg-gray-50 rounded-lg">
          <p className="mb-4">
            Watch AI automate a multi-step process with progress tracking and notifications.
          </p>
          
          <button
            onClick={() => runAIWorkflow('automateProcess')}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg text-lg font-semibold"
          >
            Start AI Automation
          </button>
          
          {results.automateProcess && aiWorkflow.renderer && 
            aiWorkflow.renderer({ data: results.automateProcess })}
        </div>
        
        <div className="p-4 bg-yellow-50 rounded">
          <h3 className="font-bold mb-2">What happens:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>AI shows a progress indicator</li>
            <li>Processes 5 sequential steps</li>
            <li>Updates progress in real-time</li>
            <li>Shows completion notification</li>
            <li>Automatically cleans up UI elements</li>
          </ol>
        </div>
      </div>
    )
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            AUI System
          </h1>
          <p className="text-2xl text-gray-600">
            Complete AI Control for Next.js Applications
          </p>
        </div>
        
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          {Object.keys(demos).map(key => (
            <button
              key={key}
              onClick={() => setActiveDemo(key)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                activeDemo === key 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
            </button>
          ))}
        </div>
        
        <div className="bg-white rounded-lg shadow-xl p-8">
          {demos[activeDemo as keyof typeof demos]}
        </div>
        
        <div className="mt-8 p-6 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Available Tools</h2>
          <div className="grid grid-cols-4 gap-2 text-sm">
            {tools.map(tool => (
              <div key={tool.name} className="p-2 bg-white rounded">
                <span className="font-mono">{tool.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
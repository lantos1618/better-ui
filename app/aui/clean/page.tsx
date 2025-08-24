'use client';

import React, { useState } from 'react';
import { 
  weatherTool, 
  searchTool, 
  calculator,
  uiControl,
  allTools,
  executeToolForAI 
} from '@/lib/aui/examples/lantos-clean';

export default function CleanAUIDemo() {
  const [results, setResults] = useState<any[]>([]);

  const runTool = async (toolName: string, input: any) => {
    try {
      const result = await executeToolForAI(toolName, input);
      setResults(prev => [...prev, { tool: toolName, input, output: result }]);
    } catch (error) {
      console.error('Tool execution failed:', error);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Lantos AUI - Clean Demo</h1>
      
      <div className="space-y-6">
        <section className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-4">Simple Weather Tool</h2>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => runTool('weather', { city: 'San Francisco' })}
          >
            Get Weather for SF
          </button>
        </section>

        <section className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-4">Calculator Tool</h2>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded"
            onClick={() => runTool('calc', { a: 10, b: 5, op: '+' })}
          >
            Calculate 10 + 5
          </button>
        </section>

        <section className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-4">UI Control Tool</h2>
          <div id="demo-element" className="p-2 bg-gray-100 mb-2">
            This element can be controlled
          </div>
          <div className="space-x-2">
            <button
              className="px-4 py-2 bg-purple-500 text-white rounded"
              onClick={() => runTool('ui', { 
                action: 'update', 
                selector: '#demo-element', 
                value: 'Updated by AI!' 
              })}
            >
              Update Text
            </button>
            <button
              className="px-4 py-2 bg-red-500 text-white rounded"
              onClick={() => runTool('ui', { 
                action: 'hide', 
                selector: '#demo-element' 
              })}
            >
              Hide
            </button>
            <button
              className="px-4 py-2 bg-green-500 text-white rounded"
              onClick={() => runTool('ui', { 
                action: 'show', 
                selector: '#demo-element' 
              })}
            >
              Show
            </button>
          </div>
        </section>

        <section className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-4">Available Tools</h2>
          <div className="grid grid-cols-2 gap-2">
            {allTools.map(tool => (
              <div key={tool.name} className="p-2 bg-gray-50 rounded">
                <strong>{tool.name}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-4">Results</h2>
          <div className="space-y-2">
            {results.map((result, i) => (
              <div key={i} className="p-2 bg-gray-50 rounded">
                <div className="font-semibold">{result.tool}</div>
                <div className="text-sm">
                  Input: {JSON.stringify(result.input)}
                </div>
                <div className="text-sm">
                  Output: {JSON.stringify(result.output)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
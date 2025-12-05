'use client';

import { useState, useCallback, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isTextUIPart, isToolOrDynamicToolUIPart, getToolOrDynamicToolName, type UIMessage } from 'ai';
import { tools } from '@/lib/tools';

const transport = new DefaultChatTransport({ api: '/api/chat' });

export default function ChatDemo() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, addToolOutput } = useChat({ transport });
  const isLoading = status === 'streaming' || status === 'submitted';

  // Use a plain object instead of Set for better React reactivity
  const [loadingTools, setLoadingTools] = useState<Record<string, boolean>>({});

  const executeToolDirect = useCallback(async (
    toolName: string,
    toolInput: any,
    toolCallId: string
  ) => {
    setLoadingTools(prev => ({ ...prev, [toolCallId]: true }));

    try {
      const response = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolName, input: toolInput }),
      });

      if (!response.ok) throw new Error('Tool execution failed');

      const { result } = await response.json();

      // Use AI SDK v5's addToolOutput to update tool results
      addToolOutput({ tool: toolName, toolCallId, output: result });
    } catch (error) {
      console.error('Tool execution error:', error);
    } finally {
      setLoadingTools(prev => {
        const { [toolCallId]: _, ...rest } = prev;
        return rest;
      });
    }
  }, [addToolOutput]);

  const callbackCacheRef = useRef<Map<string, (input: any) => void>>(new Map());
  const getOnAction = useCallback((toolCallId: string, toolName: string) => {
    const key = `${toolName}:${toolCallId}`;
    let cb = callbackCacheRef.current.get(key);
    if (!cb) {
      cb = (input: any) => executeToolDirect(toolName, input, toolCallId);
      callbackCacheRef.current.set(key, cb);
    }
    return cb;
  }, [executeToolDirect]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  // Helper to extract text content from message parts
  const getTextContent = (message: UIMessage): string => {
    return message.parts
      .filter(isTextUIPart)
      .map(part => part.text)
      .join('');
  };

  // Helper to get tool parts from a message
  // Uses isToolOrDynamicToolUIPart to handle both typed tools (type: 'tool-name')
  // and dynamic tools (type: 'dynamic-tool' with toolName property)
  const getToolParts = (message: UIMessage) => {
    const toolParts: Array<{
      toolName: string;
      toolCallId: string;
      state: string;
      output: unknown;
    }> = [];

    for (const part of message.parts) {
      if (isToolOrDynamicToolUIPart(part)) {
        const toolName = getToolOrDynamicToolName(part);
        toolParts.push({
          toolName,
          toolCallId: part.toolCallId,
          state: part.state,
          output: part.state === 'output-available' ? part.output : null,
        });
      }
    }

    return toolParts;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-medium tracking-tight">Better UI</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Tools defined once, used everywhere
          </p>
        </div>

        {/* Chat Container */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 min-h-[480px] max-h-[600px] overflow-y-auto">
          <div className="p-6 space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-16">
                <div className="text-zinc-600 text-sm space-y-2">
                  <p className="text-zinc-400 mb-4">Try something like:</p>
                  <p className="font-mono text-xs text-zinc-500">&quot;Weather in Tokyo&quot;</p>
                  <p className="font-mono text-xs text-zinc-500">&quot;Search for React hooks&quot;</p>
                  <p className="font-mono text-xs text-zinc-500">&quot;Create a score counter&quot;</p>
                </div>
              </div>
            )}

            {messages.map((message) => {
              const textContent = getTextContent(message);
              const toolParts = getToolParts(message);

              return (
                <div key={message.id} className="space-y-3">
                  {textContent && (
                    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                          message.role === 'user'
                            ? 'bg-zinc-100 text-zinc-900'
                            : 'bg-zinc-800 text-zinc-200'
                        }`}
                      >
                        {textContent}
                      </div>
                    </div>
                  )}

                  {toolParts.map((toolPart) => {
                    const { toolName, toolCallId, state, output } = toolPart;
                    const toolDef = tools[toolName as keyof typeof tools];

                    if (!toolDef) {
                      return (
                        <div key={toolCallId} className="text-sm text-zinc-500 px-4 py-2 bg-zinc-800/50 rounded-lg">
                          Unknown tool: {toolName}
                        </div>
                      );
                    }

                    const hasResult = state === 'output-available';
                    const isToolLoading = !!loadingTools[toolCallId];

                    return (
                      <div key={toolCallId}>
                        <toolDef.View
                          data={output as any}
                          loading={!hasResult || isToolLoading}
                          onAction={toolName === 'counter' ? getOnAction(toolCallId, toolName) : undefined}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
                <span>Thinking</span>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-5 py-3 bg-zinc-100 text-zinc-900 text-sm font-medium rounded-xl hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-zinc-600 text-xs mt-8">
          Define tools once with .server() and .view() &mdash; use everywhere
        </p>
      </div>
    </div>
  );
}

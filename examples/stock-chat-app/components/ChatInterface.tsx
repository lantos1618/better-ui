'use client';

import { useState, useRef, useEffect } from 'react';
import { stockTools } from '@/lib/aui-tools';
// Using path mapping for the framework
import { AUIProvider } from '@/lib/aui/provider';
import { ServerExecutor } from '@/lib/aui/server-executor';
import { ClientExecutor } from '@/lib/aui/client-executor';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolResults?: any[];
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: 'Welcome to Stock Chat! I can help you with stock prices, portfolio management, news, and market overviews. Try asking me about AAPL, GOOGL, MSFT, or TSLA!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const serverExecutor = new ServerExecutor();
  const clientExecutor = new ClientExecutor();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const executeTool = async (toolCall: any) => {
    const tool = stockTools.find(t => t.name === toolCall.tool);
    if (!tool) return null;

    try {
      // Check if tool has client execution capability
      const toolConfig = (tool as any).config;
      
      if (toolConfig?.clientHandler) {
        // Try client execution first if available
        const result = await clientExecutor.execute(tool.name, toolCall.input, {
          cache: new Map(),
          fetch: window.fetch.bind(window),
          isServer: false
        });
        return { tool: tool.name, result, renderer: tool.render };
      }
      
      // Fall back to server execution
      const result = await serverExecutor.execute(tool.name, toolCall.input, {
        cache: new Map(),
        fetch: window.fetch.bind(window),
        isServer: true
      });
      return { tool: tool.name, result, renderer: tool.render };
    } catch (error) {
      console.error('Tool execution error:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Send to chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          tools: stockTools.map(t => ({
            name: t.name,
            description: t.description
          }))
        })
      });

      const data = await response.json();
      
      // Execute any tool calls
      const toolResults = [];
      if (data.toolCalls && data.toolCalls.length > 0) {
        for (const toolCall of data.toolCalls) {
          const result = await executeTool(toolCall);
          if (result) {
            toolResults.push(result);
          }
        }
      }

      // Add assistant message with tool results
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content,
        toolResults
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AUIProvider>
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Stock Chat AI
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Powered by Gemini AI & Better-UI Framework
          </p>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message, index) => (
              <div key={index}>
                <div
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-2xl px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : message.role === 'system'
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
                
                {/* Render tool results */}
                {message.toolResults && message.toolResults.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.toolResults.map((toolResult, toolIndex) => {
                      const Renderer = toolResult.renderer;
                      return Renderer ? (
                        <div key={toolIndex} className="ml-12">
                          <Renderer data={toolResult.result} />
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-lg px-4 py-2">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-6 py-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex space-x-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about stocks, portfolio, or market news..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Try: &quot;Show me AAPL stock price&quot;, &quot;Add GOOGL to my portfolio&quot;, &quot;Get news for TSLA&quot;, &quot;Show market overview&quot;
            </div>
          </form>
        </div>
      </div>
    </AUIProvider>
  );
}
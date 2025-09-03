'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import ChatHeader from './ChatHeader';
import ToolResultCard from './ToolResultCard';
import { stockTools } from '@/lib/aui-tools';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolResults?: any[];
  toolCalls?: any[];
}

export default function EnhancedChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: 'Welcome! I can help you track stocks, manage portfolios, and provide market insights. Try asking about AAPL, GOOGL, MSFT, or TSLA!',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'connecting'>('online');
  const [suggestedQueries, setSuggestedQueries] = useState([
    "Show me AAPL stock price",
    "Add GOOGL to my portfolio", 
    "Get news for TSLA",
    "Show market overview"
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      const result = await tool.execute(toolCall.input);
      return { 
        tool: tool.name, 
        result, 
        renderer: tool.render,
        input: toolCall.input
      };
    } catch (error) {
      console.error('Tool execution error:', error);
      return null;
    }
  };

  const handleSubmit = async (e?: React.FormEvent, quickInput?: string) => {
    e?.preventDefault();
    const messageText = quickInput || input;
    if (!messageText.trim() || loading) return;

    const userMessage: Message = { 
      id: Date.now().toString(),
      role: 'user', 
      content: messageText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    if (!quickInput) setInput('');
    setLoading(true);
    setConnectionStatus('connecting');

    try {
      // Send to enhanced chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          tools: stockTools.map(t => ({
            name: t.name,
            description: t.description
          }))
        })
      });

      if (response.status === 429) {
        const data = await response.json();
        throw new Error(`Rate limit exceeded. Please wait ${Math.ceil((data.resetTime - Date.now()) / 1000)} seconds.`);
      }

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Execute tool calls
      const toolResults = [];
      if (data.toolCalls && data.toolCalls.length > 0) {
        for (const toolCall of data.toolCalls) {
          const result = await executeTool(toolCall);
          if (result) {
            toolResults.push(result);
          }
        }
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        toolResults,
        toolCalls: data.toolCalls
      };

      setMessages(prev => [...prev, assistantMessage]);
      setConnectionStatus('online');
      
      // Update suggested queries based on context
      updateSuggestedQueries(data.content);
      
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: error.message || 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }]);
      setConnectionStatus('offline');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const updateSuggestedQueries = (content: string) => {
    // Dynamically update suggestions based on conversation context
    const stockMentions = content.match(/\b[A-Z]{1,5}\b/g) || [];
    if (stockMentions.length > 0) {
      const symbol = stockMentions[0];
      setSuggestedQueries([
        `Get detailed analysis for ${symbol}`,
        `Show ${symbol} price chart`,
        `Compare ${symbol} with competitors`,
        `Get ${symbol} earnings report`
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <ChatHeader status={connectionStatus} />
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.map((message) => (
            <div key={message.id}>
              <MessageBubble 
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
              />
              
              {/* Tool Results */}
              {message.toolResults && message.toolResults.length > 0 && (
                <div className="mb-4 space-y-2 animate-slideIn">
                  {message.toolResults.map((toolResult, index) => (
                    <ToolResultCard 
                      key={index}
                      tool={toolResult.tool}
                      result={toolResult.result}
                      renderer={toolResult.renderer}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {loading && (
            <MessageBubble 
              role="assistant"
              content=""
              isTyping={true}
            />
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Actions */}
      {!loading && messages.length <= 3 && (
        <div className="px-6 py-2">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Suggested:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQueries.map((query, index) => (
                <button
                  key={index}
                  onClick={() => handleSubmit(undefined, query)}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-6 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about stocks, portfolios, or market trends..."
              className="w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
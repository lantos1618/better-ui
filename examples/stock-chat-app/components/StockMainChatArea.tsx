'use client';

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Copy, RotateCcw, Edit3, User, Bot, Loader2, TrendingUp, TrendingDown, DollarSign, BarChart3, Building2, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolResults?: any[];
  toolCalls?: any[];
  isStreaming?: boolean;
}

interface StockMainChatAreaProps {
  messages: Message[];
  inputValue: string;
  isTyping: boolean;
  onSendMessage: (content: string) => void;
  onInputChange: (value: string) => void;
}

const formatTimestamp = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(date);
};

const renderToolResult = (result: any) => {
  if (!result) return null;
  
  if (result.type === 'stock_quote') {
    const stock = result.data;
    const isUp = stock.change > 0;
    return (
      <Card className="mt-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-blue-600 dark:text-blue-400" />
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{stock.symbol}</h4>
                <Badge variant="outline" className="text-xs">{stock.exchange}</Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{stock.name}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${stock.price}</p>
              <div className={cn(
                "flex items-center gap-1 justify-end",
                isUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="font-medium">{stock.change} ({stock.changePercent}%)</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Volume</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{stock.volume}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Market Cap</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{stock.marketCap}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">P/E Ratio</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{stock.peRatio}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">52W Range</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{stock.range52w}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return null;
};

export const StockMainChatArea = ({
  messages,
  inputValue,
  isTyping,
  onSendMessage,
  onInputChange
}: StockMainChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        onSendMessage(inputValue);
      }
    }
  };
  
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };
  
  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-950">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <DollarSign className="text-blue-600 dark:text-blue-400" size={24} />
              Stock Market Assistant
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Powered by AI • Real-time market insights</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Live Market Data</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <AnimatePresence>
              {messages.map(message => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={cn(
                    "flex gap-4",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <Bot size={16} className="text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  )}
                  
                  <div className={cn(
                    "group max-w-2xl",
                    message.role === 'user' ? 'order-1' : ''
                  )}>
                    <div className={cn(
                      "px-4 py-3 rounded-2xl",
                      message.role === 'user'
                        ? "bg-blue-600 dark:bg-blue-500 text-white ml-auto"
                        : "bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    )}>
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </div>
                    
                    {message.toolResults && message.toolResults.map((result, idx) => (
                      <div key={idx}>
                        {renderToolResult(result)}
                      </div>
                    ))}
                    
                    <div className={cn(
                      "flex items-center gap-2 mt-2",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(message.timestamp)}
                      </span>
                      
                      {message.role === 'assistant' && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                            <Copy size={14} />
                          </button>
                          <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                            <RotateCcw size={14} />
                          </button>
                        </div>
                      )}
                      
                      {message.role === 'user' && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                            <Edit3 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0 order-2">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <User size={16} className="text-gray-600 dark:text-gray-400" />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing Indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <Bot size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-900 px-4 py-3 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-500 dark:text-gray-400">Analyzing market data...</span>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 focus-within:border-blue-300 dark:focus-within:border-blue-700 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900">
              <button
                type="button"
                className="flex-shrink-0 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Paperclip size={18} />
              </button>
              
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={e => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about stocks, market trends, or financial analysis..."
                className="flex-1 bg-transparent border-none outline-none resize-none min-h-[24px] max-h-[120px] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                rows={1}
              />
              
              <motion.button
                type="submit"
                disabled={!inputValue.trim()}
                className={cn(
                  "flex-shrink-0 p-2 rounded-lg transition-all",
                  inputValue.trim()
                    ? "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                )}
                whileHover={inputValue.trim() ? { scale: 1.05 } : {}}
                whileTap={inputValue.trim() ? { scale: 0.95 } : {}}
              >
                <Send size={18} />
              </motion.button>
            </div>
          </form>
          
          <div className="flex items-center justify-center gap-4 mt-3">
            <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1">
              <Hash size={12} />
              Quick Actions
            </button>
            <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1">
              <BarChart3 size={12} />
              Market Analysis
            </button>
            <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1">
              <TrendingUp size={12} />
              Top Movers
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Paperclip, Copy, RotateCcw, Edit3, User, Bot, Loader2, 
  TrendingUp, TrendingDown, DollarSign, BarChart3, Building2, 
  Hash, Mic, Image, Sparkles, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolResults?: any[];
  toolCalls?: any[];
  isStreaming?: boolean;
}

interface EnhancedMainChatProps {
  messages: Message[];
  inputValue: string;
  isTyping: boolean;
  onSendMessage: (content: string) => void;
  onInputChange: (value: string) => void;
  rateLimitInfo?: { remaining: number; reset: number };
}

const formatTimestamp = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(date);
};

const QuickActions = ({ onAction }: { onAction: (action: string) => void }) => {
  const actions = [
    { icon: TrendingUp, label: 'Top Gainers', query: 'Show me today\'s top gainers' },
    { icon: TrendingDown, label: 'Top Losers', query: 'Show me today\'s top losers' },
    { icon: BarChart3, label: 'Market Analysis', query: 'Give me a market analysis' },
    { icon: DollarSign, label: 'Portfolio', query: 'Check my portfolio performance' },
  ];

  return (
    <motion.div
      className="flex flex-wrap gap-2 mb-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {actions.map((action, index) => (
        <motion.button
          key={action.label}
          onClick={() => onAction(action.query)}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-all duration-200 shadow-sm hover:shadow-md"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <action.icon size={16} className="text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
        </motion.button>
      ))}
    </motion.div>
  );
};

const renderToolResult = (result: any) => {
  if (!result) return null;
  
  if (result.type === 'stock_quote') {
    const stock = result.data;
    const isUp = stock.change > 0;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="mt-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 shadow-sm hover:shadow-md transition-shadow">
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
                <motion.p
                  className="text-2xl font-bold text-gray-900 dark:text-gray-100"
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  ${stock.price}
                </motion.p>
                <div className={cn(
                  "flex items-center gap-1 justify-end",
                  isUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  <motion.div
                    animate={{ y: isUp ? [-2, 0] : [2, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                  >
                    {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </motion.div>
                  <span className="font-medium">{stock.change} ({stock.changePercent}%)</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4">
              {[
                { label: 'Volume', value: stock.volume },
                { label: 'Market Cap', value: stock.marketCap },
                { label: 'P/E Ratio', value: stock.peRatio },
                { label: '52W Range', value: stock.range52w },
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.value}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }
  
  return null;
};

export const EnhancedMainChat = ({
  messages,
  inputValue,
  isTyping,
  onSendMessage,
  onInputChange,
  rateLimitInfo
}: EnhancedMainChatProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showQuickActions, setShowQuickActions] = useState(messages.length <= 1);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setShowQuickActions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleQuickAction = (query: string) => {
    onInputChange(query);
    onSendMessage(query);
    setShowQuickActions(false);
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
    <div className="flex-1 flex flex-col h-full bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
      {/* Chat Header */}
      <motion.div
        className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="relative"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="text-blue-600 dark:text-blue-400" size={24} />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                AI Stock Assistant
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Powered by advanced market intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {rateLimitInfo && (
              <motion.div
                className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  rateLimitInfo.remaining > 10 ? "bg-green-500" : rateLimitInfo.remaining > 5 ? "bg-yellow-500" : "bg-red-500"
                )} />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {rateLimitInfo.remaining} requests left
                </span>
              </motion.div>
            )}
            <motion.div
              className="flex items-center gap-2"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Live</span>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          {showQuickActions && messages.length <= 1 && (
            <QuickActions onAction={handleQuickAction} />
          )}
          
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={cn(
                  "flex gap-4 mb-6",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <motion.div
                    className="flex-shrink-0"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                      <Bot size={20} className="text-white" />
                    </div>
                  </motion.div>
                )}
                
                <div className={cn(
                  "group max-w-2xl",
                  message.role === 'user' ? 'order-1' : ''
                )}>
                  <motion.div
                    className={cn(
                      "px-4 py-3 rounded-2xl shadow-sm",
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ml-auto'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                    )}
                    whileHover={{ scale: 1.01 }}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    {message.toolResults?.map((result, idx) => (
                      <div key={idx}>{renderToolResult(result)}</div>
                    ))}
                  </motion.div>
                  
                  <div className={cn(
                    "flex items-center gap-2 mt-2",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimestamp(message.timestamp)}
                    </span>
                    
                    <TooltipProvider>
                      {message.role === 'assistant' && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => navigator.clipboard.writeText(message.content)}
                              >
                                <Copy size={14} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <RotateCcw size={14} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Regenerate</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                      
                      {message.role === 'user' && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Edit3 size={14} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </TooltipProvider>
                  </div>
                </div>

                {message.role === 'user' && (
                  <motion.div
                    className="flex-shrink-0 order-2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center shadow-lg">
                      <User size={20} className="text-white" />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex gap-4"
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                    <Bot size={20} className="text-white" />
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-500 dark:text-gray-400">AI is analyzing markets...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <motion.div
        className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 focus-within:border-blue-400 dark:focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/50 transition-all">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                    >
                      <Paperclip size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Attach file</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                    >
                      <Image size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add image</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about stocks, markets, or your portfolio..."
                className="flex-1 bg-transparent border-none outline-none resize-none min-h-[24px] max-h-[120px] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                rows={1}
              />
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                    >
                      <Mic size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Voice input</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <motion.button
                type="submit"
                disabled={!inputValue.trim()}
                className={cn(
                  "flex-shrink-0 p-2 rounded-lg transition-all",
                  inputValue.trim()
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                )}
                whileHover={inputValue.trim() ? { scale: 1.05 } : {}}
                whileTap={inputValue.trim() ? { scale: 0.95 } : {}}
              >
                <Send size={18} />
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
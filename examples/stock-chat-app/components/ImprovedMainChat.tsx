'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Paperclip, Copy, RotateCcw, Edit3, User, Bot, Loader2, 
  TrendingUp, TrendingDown, DollarSign, BarChart3, Building2, 
  Hash, Mic, Image as ImageIcon, Sparkles, AlertCircle, ArrowUp,
  ArrowDown, Activity, Clock, Calendar, Zap
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

interface ImprovedMainChatProps {
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
    { icon: TrendingUp, label: 'Top Gainers', query: "Show me today's top gainers", color: 'from-green-500 to-emerald-500' },
    { icon: TrendingDown, label: 'Top Losers', query: "Show me today's top losers", color: 'from-red-500 to-rose-500' },
    { icon: BarChart3, label: 'Market Analysis', query: 'Give me a market analysis', color: 'from-blue-500 to-indigo-500' },
    { icon: DollarSign, label: 'Portfolio', query: 'Check my portfolio performance', color: 'from-purple-500 to-pink-500' },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {actions.map((action, index) => (
        <motion.button
          key={action.label}
          onClick={() => onAction(action.query)}
          className="relative overflow-hidden group"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
               style={{ backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))` }}>
            <div className={cn('absolute inset-0 bg-gradient-to-r opacity-10', action.color)} />
          </div>
          <div className="relative flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 shadow-sm hover:shadow-lg">
            <div className={cn('p-2 rounded-lg bg-gradient-to-r', action.color)}>
              <action.icon size={20} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
          </div>
        </motion.button>
      ))}
    </motion.div>
  );
};

const StockCard = ({ stock }: { stock: any }) => {
  const isUp = stock.change > 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      className="group"
    >
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 shadow-md">
                <Building2 size={20} className="text-white" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100">{stock.symbol}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stock.name}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-semibold">
              {stock.exchange}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Price</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ${stock.price?.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Change</p>
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ y: isUp ? -2 : 2 }}
                  transition={{ repeat: Infinity, repeatType: 'reverse', duration: 1 }}
                >
                  {isUp ? (
                    <ArrowUp className="text-green-500" size={20} />
                  ) : (
                    <ArrowDown className="text-red-500" size={20} />
                  )}
                </motion.div>
                <div>
                  <p className={cn(
                    'text-lg font-semibold',
                    isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {isUp ? '+' : ''}{stock.change?.toFixed(2)}
                  </p>
                  <p className={cn(
                    'text-sm',
                    isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    ({isUp ? '+' : ''}{stock.changePercent?.toFixed(2)}%)
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Volume</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {(stock.volume / 1000000).toFixed(2)}M
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Market Cap</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                ${(stock.marketCap / 1000000000).toFixed(2)}B
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">P/E Ratio</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {stock.peRatio?.toFixed(2) || 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const renderToolResult = (result: any) => {
  if (!result) return null;
  
  if (result.type === 'stock_quote') {
    return <StockCard stock={result.data} />;
  }
  
  if (result.type === 'stock_list') {
    return (
      <div className="grid gap-3">
        {result.data.map((stock: any, index: number) => (
          <motion.div
            key={stock.symbol}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <StockCard stock={stock} />
          </motion.div>
        ))}
      </div>
    );
  }
  
  return null;
};

export const ImprovedMainChat = ({
  messages,
  inputValue,
  isTyping,
  onSendMessage,
  onInputChange,
  rateLimitInfo
}: ImprovedMainChatProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && (!rateLimitInfo || rateLimitInfo.remaining > 0)) {
      onSendMessage(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
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

  const handleQuickAction = (query: string) => {
    onSendMessage(query);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
      <motion.div
        className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="relative"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
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
                transition={{ duration: 0.3 }}
              >
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  rateLimitInfo.remaining > 10 ? 'bg-green-500' : 
                  rateLimitInfo.remaining > 5 ? 'bg-yellow-500' : 'bg-red-500'
                )} />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {rateLimitInfo.remaining} requests left
                </span>
              </motion.div>
            )}
            <motion.div
              className="flex items-center gap-2"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Live</span>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <ScrollArea className="flex-1 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          {messages.length === 1 && (
            <QuickActions onAction={handleQuickAction} />
          )}
          
          <div className="space-y-6">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={cn(
                    'flex gap-4',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <motion.div
                      className="flex-shrink-0"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                        <Bot size={20} className="text-white" />
                      </div>
                    </motion.div>
                  )}
                  
                  <div className={cn('group max-w-2xl', message.role === 'user' && 'order-1')}>
                    <motion.div
                      className={cn(
                        'px-4 py-3 rounded-2xl shadow-sm',
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                      )}
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </motion.div>
                    
                    {message.toolResults && message.toolResults.map((result, i) => (
                      <div key={i} className="mt-3">
                        {renderToolResult(result)}
                      </div>
                    ))}
                    
                    <div className={cn(
                      'flex items-center gap-2 mt-2',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(message.timestamp)}
                      </span>
                      
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        {message.role === 'assistant' && (
                          <>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <Copy size={14} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy message</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <RotateCcw size={14} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Regenerate response</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </>
                        )}
                        {message.role === 'user' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <Edit3 size={14} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit message</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {message.role === 'user' && (
                    <motion.div
                      className="flex-shrink-0 order-2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center shadow-lg">
                        <User size={20} className="text-white" />
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4"
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                    <Bot size={20} className="text-white" />
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-500 dark:text-gray-400">AI is analyzing market data...</span>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </ScrollArea>

      <motion.div
        className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
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
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                    >
                      <ImageIcon size={18} />
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
                      onClick={() => setIsRecording(!isRecording)}
                    >
                      <Mic size={18} className={cn(isRecording && 'text-red-500 animate-pulse')} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Voice input</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <motion.button
                type="submit"
                disabled={!inputValue.trim() || (rateLimitInfo && rateLimitInfo.remaining <= 0)}
                className={cn(
                  'flex-shrink-0 p-2 rounded-lg transition-all',
                  inputValue.trim() && (!rateLimitInfo || rateLimitInfo.remaining > 0)
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
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
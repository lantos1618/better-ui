'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ImprovedSidebar } from './ImprovedSidebar';
import { ImprovedMainChat } from './ImprovedMainChat';
import { cn } from '@/lib/utils';
import { Menu, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface ChatData {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  category?: 'analysis' | 'portfolio' | 'earnings' | 'news';
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolResults?: any[];
  toolCalls?: any[];
  isStreaming?: boolean;
}

interface MarketIndex {
  name: string;
  symbol: string;
  value: string;
  change: string;
  changePercent: string;
  isUp: boolean;
}

const marketIndices: MarketIndex[] = [
  { name: 'S&P 500', symbol: 'SPX', value: '5,845.21', change: '+48.15', changePercent: '+0.82%', isUp: true },
  { name: 'NASDAQ', symbol: 'NDX', value: '18,452.09', change: '+226.42', changePercent: '+1.24%', isUp: true },
  { name: 'DOW', symbol: 'DJI', value: '42,156.33', change: '-63.21', changePercent: '-0.15%', isUp: false },
  { name: 'Russell 2000', symbol: 'RUT', value: '2,234.67', change: '+12.45', changePercent: '+0.56%', isUp: true },
];

const ImprovedStockChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Welcome to your AI-powered Stock Market Assistant! I can help you with real-time stock quotes, market analysis, portfolio tracking, and financial insights. What would you like to know about the markets today?',
      timestamp: new Date(),
    }
  ]);
  
  const [chats, setChats] = useState<ChatData[]>([
    {
      id: '1',
      title: 'Market Analysis',
      lastMessage: 'Tell me about AAPL',
      timestamp: '2 min ago',
      category: 'analysis'
    },
    {
      id: '2',
      title: 'Portfolio Review',
      lastMessage: 'How is my tech portfolio doing?',
      timestamp: '1 hour ago',
      category: 'portfolio'
    },
    {
      id: '3',
      title: 'NVDA Earnings',
      lastMessage: 'NVDA earnings analysis',
      timestamp: '2 hours ago',
      category: 'earnings'
    }
  ]);
  
  const [currentChatId, setCurrentChatId] = useState('1');
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState({ remaining: 30, reset: Date.now() + 60000 });
  
  useEffect(() => {
    setIsHydrated(true);
    const stored = localStorage.getItem('darkMode');
    if (stored) {
      setIsDarkMode(JSON.parse(stored));
    }
  }, []);
  
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDarkMode, isHydrated]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || rateLimitInfo.remaining <= 0) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setRateLimitInfo(prev => ({ ...prev, remaining: prev.remaining - 1 }));
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || 'I encountered an error processing your request.',
        timestamp: new Date(),
        toolResults: data.toolResults,
        toolCalls: data.toolCalls,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again later.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, rateLimitInfo.remaining]);
  
  const handleNewChat = useCallback(() => {
    const newChat: ChatData = {
      id: Date.now().toString(),
      title: 'New Chat',
      lastMessage: '',
      timestamp: 'Just now',
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setMessages([{
      id: '1',
      role: 'assistant',
      content: 'How can I help you with the stock market today?',
      timestamp: new Date(),
    }]);
  }, []);
  
  const handleChatSelect = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
  }, []);
  
  const handleSettingsOpen = useCallback(() => {
    console.log('Opening settings...');
  }, []);

  if (!isHydrated) {
    return null;
  }

  return (
    <div className={cn('flex h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 transition-colors duration-500')}>
      <AnimatePresence mode="wait">
        <motion.div
          className="hidden lg:block"
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <ImprovedSidebar
            chats={chats}
            currentChatId={currentChatId}
            onNewChat={handleNewChat}
            onChatSelect={handleChatSelect}
            onSettingsOpen={handleSettingsOpen}
          />
        </motion.div>
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden">
        <motion.header
          className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 py-3 shadow-sm"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-80">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Navigation Menu</SheetTitle>
                  </SheetHeader>
                  <ImprovedSidebar
                    chats={chats}
                    currentChatId={currentChatId}
                    onNewChat={handleNewChat}
                    onChatSelect={(id) => {
                      handleChatSelect(id);
                      setIsMobileMenuOpen(false);
                    }}
                    onSettingsOpen={() => {
                      handleSettingsOpen();
                      setIsMobileMenuOpen(false);
                    }}
                  />
                </SheetContent>
              </Sheet>
              
              <motion.div
                className="flex items-center gap-2"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
              >
                <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Stock Assistant
                </div>
              </motion.div>
            </div>

            <div className="flex items-center gap-4">
              <motion.div
                className="hidden md:flex items-center gap-3 overflow-x-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {marketIndices.map((index, i) => (
                  <motion.div
                    key={index.symbol}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {index.symbol}
                    </span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {index.value}
                    </span>
                    <span className={cn(
                      'text-xs font-medium',
                      index.isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    )}>
                      {index.changePercent}
                    </span>
                  </motion.div>
                ))}
              </motion.div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="rounded-full"
              >
                <AnimatePresence mode="wait">
                  {isDarkMode ? (
                    <motion.div
                      key="moon"
                      initial={{ rotate: -90, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      exit={{ rotate: 90, scale: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Moon className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="sun"
                      initial={{ rotate: 90, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      exit={{ rotate: -90, scale: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Sun className="h-5 w-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </div>
        </motion.header>

        <ImprovedMainChat
          messages={messages}
          inputValue={inputValue}
          isTyping={isTyping}
          onSendMessage={handleSendMessage}
          onInputChange={setInputValue}
          rateLimitInfo={rateLimitInfo}
        />
      </div>
    </div>
  );
};

export default ImprovedStockChat;
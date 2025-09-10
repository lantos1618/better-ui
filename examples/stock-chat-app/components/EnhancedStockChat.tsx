'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { EnhancedSidebar } from './EnhancedSidebar';
import { EnhancedMainChat } from './EnhancedMainChat';
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

const EnhancedStockChat = () => {
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
      timestamp: '2 min ago'
    },
    {
      id: '2',
      title: 'Portfolio Review',
      lastMessage: 'How is my tech portfolio doing?',
      timestamp: '1 hour ago'
    },
    {
      id: '3',
      title: 'Earnings Report',
      lastMessage: 'NVDA earnings analysis',
      timestamp: '2 hours ago'
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
    if (!content.trim()) return;
    
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        toolResults: data.toolResults,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setRateLimitInfo(data.rateLimitInfo || rateLimitInfo);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again later.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, rateLimitInfo]);
  
  const handleNewChat = () => {
    const newChatId = `chat-${Date.now()}`;
    const newChat: ChatData = {
      id: newChatId,
      title: 'New Chat',
      lastMessage: '',
      timestamp: 'Just now'
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    setMessages([{
      id: '1',
      role: 'assistant',
      content: 'How can I help you with the stock market today?',
      timestamp: new Date(),
    }]);
  };
  
  const handleChatSelect = (chatId: string) => {
    setCurrentChatId(chatId);
  };
  
  const handleSettingsOpen = () => {
    console.log('Settings opened');
  };
  
  if (!isHydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950">
      {/* Desktop Sidebar */}
      <motion.div 
        className="hidden md:block"
        initial={{ x: -320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
      >
        <EnhancedSidebar
          chats={chats}
          currentChatId={currentChatId}
          marketIndices={marketIndices}
          onNewChat={handleNewChat}
          onChatSelect={handleChatSelect}
          onSettingsOpen={handleSettingsOpen}
        />
      </motion.div>
      
      {/* Mobile Menu */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg"
          >
            <Menu size={20} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <EnhancedSidebar
            chats={chats}
            currentChatId={currentChatId}
            marketIndices={marketIndices}
            onNewChat={handleNewChat}
            onChatSelect={handleChatSelect}
            onSettingsOpen={handleSettingsOpen}
          />
        </SheetContent>
      </Sheet>
      
      {/* Main Chat Area */}
      <motion.div 
        className="flex-1 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <EnhancedMainChat
          messages={messages}
          inputValue={inputValue}
          isTyping={isTyping}
          onSendMessage={handleSendMessage}
          onInputChange={setInputValue}
          rateLimitInfo={rateLimitInfo}
        />
      </motion.div>
      
      {/* Dark Mode Toggle */}
      <motion.div
        className="fixed bottom-4 right-4 z-40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:scale-110 transition-transform"
        >
          <AnimatePresence mode="wait">
            {isDarkMode ? (
              <motion.div
                key="sun"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Sun size={20} className="text-yellow-500" />
              </motion.div>
            ) : (
              <motion.div
                key="moon"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Moon size={20} className="text-blue-600" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>
    </div>
  );
};

export default EnhancedStockChat;
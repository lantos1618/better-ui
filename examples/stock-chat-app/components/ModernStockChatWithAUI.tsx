'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StockChatSidebar } from './StockChatSidebar';
import { StockMainChatArea } from './StockMainChatArea';
// import { useAUITools, AUIProvider } from '@lantos1618/better-ui';
import { stockTools } from '@/lib/aui-tools';
import { cn } from '@/lib/utils';
import { Menu, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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

const ModernStockChatWithAUI = () => {
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
      timestamp: 'Yesterday'
    }
  ]);
  
  const [currentChatId, setCurrentChatId] = useState('1');
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState({ remaining: 30, reset: Date.now() + 60000 });
  
  // Initialize AUI tools (simplified for now)
  // const { executeTools, isExecuting } = useAUITools(stockTools);
  const isExecuting = false;
  
  useEffect(() => {
    // Apply dark mode class to document
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  // Rate limiting check
  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    if (now > rateLimitInfo.reset) {
      setRateLimitInfo({ remaining: 30, reset: now + 60000 });
      return true;
    }
    if (rateLimitInfo.remaining <= 0) {
      return false;
    }
    return true;
  }, [rateLimitInfo]);
  
  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !checkRateLimit()) {
      if (!checkRateLimit()) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'system',
          content: 'Rate limit exceeded. Please wait a moment before sending another message.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
      return;
    }
    
    // Update rate limit
    setRateLimitInfo(prev => ({ ...prev, remaining: prev.remaining - 1 }));
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    try {
      // Simulate API call with better-ui integration
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          model: 'gemini-1.5-flash',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || 'I understand you want to know about the markets. Let me help you with that.',
        timestamp: new Date(),
        toolResults: data.toolResults,
        toolCalls: data.toolCalls,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update chat title if it's the first real message
      if (messages.length <= 2) {
        setChats(prev => prev.map(chat => 
          chat.id === currentChatId 
            ? { ...chat, lastMessage: content.substring(0, 50), timestamp: 'Just now' }
            : chat
        ));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, checkRateLimit, rateLimitInfo]);
  
  const handleNewChat = () => {
    const newChatId = Date.now().toString();
    const newChat: ChatData = {
      id: newChatId,
      title: 'New Chat',
      lastMessage: 'Start a conversation...',
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
    // In a real app, load messages for this chat from storage
  };
  
  const handleSettingsOpen = () => {
    // Settings modal would go here
    console.log('Opening settings');
  };
  
  return (
    <div className="flex h-screen w-full bg-gray-50 dark:bg-gray-900">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <StockChatSidebar
            chats={chats}
            currentChatId={currentChatId}
            marketIndices={marketIndices}
            onNewChat={handleNewChat}
            onChatSelect={handleChatSelect}
            onSettingsOpen={handleSettingsOpen}
          />
        </div>
        
        {/* Mobile Menu */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-80">
            <StockChatSidebar
              chats={chats}
              currentChatId={currentChatId}
              marketIndices={marketIndices}
              onNewChat={handleNewChat}
              onChatSelect={handleChatSelect}
              onSettingsOpen={handleSettingsOpen}
            />
          </SheetContent>
        </Sheet>
        
        {/* Main Chat Area with Header */}
        <div className="flex-1 flex flex-col">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Stock Assistant</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
          
          {/* Desktop Dark Mode Toggle */}
          <div className="hidden lg:block absolute top-4 right-4 z-10">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg p-2 shadow-sm border border-gray-200 dark:border-gray-800">
              <Sun className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Switch
                checked={isDarkMode}
                onCheckedChange={setIsDarkMode}
                className="data-[state=checked]:bg-blue-600"
              />
              <Moon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </div>
          </div>
          
          {/* Chat Area */}
          <StockMainChatArea
            messages={messages}
            inputValue={inputValue}
            isTyping={isTyping || isExecuting}
            onSendMessage={handleSendMessage}
            onInputChange={setInputValue}
          />
          
          {/* Rate Limit Indicator */}
          {rateLimitInfo.remaining < 10 && (
            <div className="absolute bottom-20 right-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-lg text-xs">
              {rateLimitInfo.remaining} requests remaining
            </div>
          )}
        </div>
      </div>
  );
};

export default ModernStockChatWithAUI;
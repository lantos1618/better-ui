'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, MessageSquare, Settings, Search, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ChatData {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

interface MarketIndex {
  name: string;
  symbol: string;
  value: string;
  change: string;
  changePercent: string;
  isUp: boolean;
}

interface StockChatSidebarProps {
  chats: ChatData[];
  currentChatId: string;
  marketIndices: MarketIndex[];
  onNewChat: () => void;
  onChatSelect: (chatId: string) => void;
  onSettingsOpen: () => void;
}

export const StockChatSidebar = ({
  chats,
  currentChatId,
  marketIndices,
  onNewChat,
  onChatSelect,
  onSettingsOpen
}: StockChatSidebarProps) => {
  return (
    <div className="w-80 h-full bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-800">
        <motion.button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={20} />
          <span className="font-medium">New Stock Chat</span>
        </motion.button>
      </div>

      {/* Market Indices */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
          <Activity size={14} />
          Market Overview
        </h3>
        <div className="space-y-2">
          {marketIndices.map(index => (
            <div key={index.symbol} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  index.isUp ? "bg-green-500" : "bg-red-500"
                )} />
                <div>
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{index.symbol}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{index.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{index.value}</p>
                <p className={cn(
                  "text-xs font-medium",
                  index.isUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {index.change} ({index.changePercent})
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Search conversations..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="px-4 space-y-2">
          {chats.map(chat => (
            <motion.button
              key={chat.id}
              onClick={() => onChatSelect(chat.id)}
              className={cn(
                "w-full text-left p-4 rounded-xl transition-all duration-200",
                currentChatId === chat.id
                  ? "bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"
                  : "hover:bg-gray-50 dark:hover:bg-gray-900 border border-transparent"
              )}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <MessageSquare
                    size={18}
                    className={currentChatId === chat.id ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "font-medium text-sm mb-1 truncate",
                    currentChatId === chat.id
                      ? "text-blue-900 dark:text-blue-100"
                      : "text-gray-900 dark:text-gray-100"
                  )}>
                    {chat.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
                    {chat.lastMessage}
                  </p>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {chat.timestamp}
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <motion.button
          onClick={onSettingsOpen}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl transition-colors"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <Settings size={18} />
          <span className="font-medium">Settings</span>
        </motion.button>
      </div>
    </div>
  );
};
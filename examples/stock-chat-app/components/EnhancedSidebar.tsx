'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, MessageSquare, Settings, Search, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

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

interface EnhancedSidebarProps {
  chats: ChatData[];
  currentChatId: string;
  marketIndices: MarketIndex[];
  onNewChat: () => void;
  onChatSelect: (chatId: string) => void;
  onSettingsOpen: () => void;
}

export const EnhancedSidebar = ({
  chats,
  currentChatId,
  marketIndices,
  onNewChat,
  onChatSelect,
  onSettingsOpen
}: EnhancedSidebarProps) => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <div className="w-80 h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <motion.button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-200"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={20} />
          <span className="font-semibold">New Chat</span>
        </motion.button>
      </div>

      {/* Market Indices */}
      <motion.div
        className="px-4 py-3 border-b border-gray-200 dark:border-gray-800"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Market Overview</h3>
        </div>
        <div className="space-y-2">
          {marketIndices.map((index, i) => (
            <motion.div
              key={index.symbol}
              variants={item}
              className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  index.isUp ? "bg-green-500" : "bg-red-500"
                )} />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{index.symbol}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{index.value}</span>
                <div className={cn(
                  "flex items-center gap-0.5",
                  index.isUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {index.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span className="text-xs font-medium">{index.changePercent}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Search */}
      <div className="p-4">
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </motion.div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 px-4">
        <motion.div
          className="space-y-2"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {chats.map((chat) => (
            <motion.button
              key={chat.id}
              onClick={() => onChatSelect(chat.id)}
              variants={item}
              className={cn(
                "w-full text-left p-4 rounded-xl transition-all duration-200",
                currentChatId === chat.id
                  ? "bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border border-blue-200 dark:border-blue-800 shadow-sm"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent"
              )}
              whileHover={{ scale: 1.01, x: 4 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-start gap-3">
                <motion.div
                  className="flex-shrink-0 mt-1"
                  animate={currentChatId === chat.id ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  <MessageSquare
                    size={18}
                    className={cn(
                      "transition-colors",
                      currentChatId === chat.id
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-400 dark:text-gray-500"
                    )}
                  />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "font-medium text-sm mb-1 truncate transition-colors",
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
        </motion.div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <motion.button
          onClick={onSettingsOpen}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all duration-200"
          whileHover={{ scale: 1.01, x: 4 }}
          whileTap={{ scale: 0.99 }}
        >
          <Settings size={18} />
          <span className="font-medium">Settings</span>
        </motion.button>
      </div>
    </div>
  );
};
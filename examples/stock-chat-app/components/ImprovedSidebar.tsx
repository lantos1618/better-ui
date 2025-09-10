'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, MessageSquare, Settings, Search, TrendingUp,
  Briefcase, FileText, Newspaper, ChevronRight,
  Clock, Star, Archive, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatData {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  category?: 'analysis' | 'portfolio' | 'earnings' | 'news';
}

interface ImprovedSidebarProps {
  chats: ChatData[];
  currentChatId: string;
  onNewChat: () => void;
  onChatSelect: (chatId: string) => void;
  onSettingsOpen: () => void;
}

const categoryIcons = {
  analysis: TrendingUp,
  portfolio: Briefcase,
  earnings: FileText,
  news: Newspaper,
};

const categoryColors = {
  analysis: 'text-blue-600 dark:text-blue-400',
  portfolio: 'text-green-600 dark:text-green-400',
  earnings: 'text-purple-600 dark:text-purple-400',
  news: 'text-orange-600 dark:text-orange-400',
};

export const ImprovedSidebar = ({
  chats,
  currentChatId,
  onNewChat,
  onChatSelect,
  onSettingsOpen
}: ImprovedSidebarProps) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [hoveredChatId, setHoveredChatId] = React.useState<string | null>(null);

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedChats = React.useMemo(() => {
    const today: ChatData[] = [];
    const yesterday: ChatData[] = [];
    const lastWeek: ChatData[] = [];
    const older: ChatData[] = [];

    filteredChats.forEach(chat => {
      if (chat.timestamp.includes('min') || chat.timestamp.includes('Just now')) {
        today.push(chat);
      } else if (chat.timestamp.includes('hour')) {
        yesterday.push(chat);
      } else if (chat.timestamp.includes('day')) {
        lastWeek.push(chat);
      } else {
        older.push(chat);
      }
    });

    return { today, yesterday, lastWeek, older };
  }, [filteredChats]);

  const ChatGroup = ({ title, chats }: { title: string; chats: ChatData[] }) => {
    if (chats.length === 0) return null;

    return (
      <div className="mb-4">
        <motion.h3
          className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 mb-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {title}
        </motion.h3>
        <AnimatePresence>
          {chats.map((chat, index) => {
            const Icon = chat.category ? categoryIcons[chat.category] : MessageSquare;
            const colorClass = chat.category ? categoryColors[chat.category] : 'text-gray-600 dark:text-gray-400';
            const isActive = chat.id === currentChatId;
            const isHovered = chat.id === hoveredChatId;

            return (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <button
                  onClick={() => onChatSelect(chat.id)}
                  onMouseEnter={() => setHoveredChatId(chat.id)}
                  onMouseLeave={() => setHoveredChatId(null)}
                  className={cn(
                    'w-full px-3 py-2.5 mb-1 rounded-lg transition-all duration-200 group relative',
                    isActive
                      ? 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 border-l-2 border-blue-500'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <motion.div
                      animate={{
                        scale: isHovered ? 1.1 : 1,
                        rotate: isHovered ? 5 : 0
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    >
                      <Icon size={16} className={cn(colorClass, 'mt-0.5')} />
                    </motion.div>
                    <div className="flex-1 text-left">
                      <p className={cn(
                        'text-sm font-medium line-clamp-1',
                        isActive
                          ? 'text-gray-900 dark:text-gray-100'
                          : 'text-gray-700 dark:text-gray-300'
                      )}>
                        {chat.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                        {chat.lastMessage}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {chat.timestamp}
                      </span>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex gap-1"
                        >
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('Star chat:', chat.id);
                                  }}
                                >
                                  <Star size={12} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Star conversation</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('Archive chat:', chat.id);
                                  }}
                                >
                                  <Archive size={12} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Archive conversation</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </motion.div>
                      )}
                    </div>
                  </div>
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-lg pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-lg" />
                    </motion.div>
                  )}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="w-80 h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <motion.div
        className="p-4 border-b border-gray-200 dark:border-gray-800"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Button
          onClick={onNewChat}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <motion.div
            className="flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus size={18} />
            <span>New Analysis</span>
          </motion.div>
        </Button>
      </motion.div>

      <div className="px-4 py-3">
        <motion.div
          className="relative"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </motion.div>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="py-2">
          <ChatGroup title="Today" chats={groupedChats.today} />
          <ChatGroup title="Yesterday" chats={groupedChats.yesterday} />
          <ChatGroup title="Last 7 Days" chats={groupedChats.lastWeek} />
          <ChatGroup title="Older" chats={groupedChats.older} />
        </div>
      </ScrollArea>

      <motion.div
        className="p-4 border-t border-gray-200 dark:border-gray-800"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Button
          variant="ghost"
          onClick={onSettingsOpen}
          className="w-full justify-start hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Settings size={18} className="mr-2" />
          <span>Settings</span>
        </Button>
      </motion.div>
    </div>
  );
};
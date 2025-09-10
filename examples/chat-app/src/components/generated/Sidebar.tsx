import React from 'react';
import { motion } from 'framer-motion';
import { Plus, MessageSquare, Settings, Search } from 'lucide-react';
interface ChatData {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}
interface SidebarProps {
  chats: ChatData[];
  currentChatId: string;
  onNewChat: () => void;
  onChatSelect: (chatId: string) => void;
  onSettingsOpen: () => void;
}

// @component: Sidebar
export const Sidebar = ({
  chats,
  currentChatId,
  onNewChat,
  onChatSelect,
  onSettingsOpen
}: SidebarProps) => {
  // @return
  return <div className="w-80 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <motion.button onClick={onNewChat} className="w-full flex items-center gap-3 px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors" whileHover={{
        scale: 1.02
      }} whileTap={{
        scale: 0.98
      }}>
          <Plus size={20} />
          <span className="font-medium">New Chat</span>
        </motion.button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Search conversations..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-4">
        <div className="space-y-2">
          {chats.map(chat => <motion.button key={chat.id} onClick={() => onChatSelect(chat.id)} className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${currentChatId === chat.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}`} whileHover={{
          scale: 1.01
        }} whileTap={{
          scale: 0.99
        }}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <MessageSquare size={18} className={currentChatId === chat.id ? 'text-blue-600' : 'text-gray-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium text-sm mb-1 truncate ${currentChatId === chat.id ? 'text-blue-900' : 'text-gray-900'}`}>
                    {chat.title}
                  </h3>
                  <p className="text-xs text-gray-500 truncate mb-2">
                    {chat.lastMessage}
                  </p>
                  <span className="text-xs text-gray-400">
                    {chat.timestamp}
                  </span>
                </div>
              </div>
            </motion.button>)}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <motion.button onClick={onSettingsOpen} className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors" whileHover={{
        scale: 1.01
      }} whileTap={{
        scale: 0.99
      }}>
          <Settings size={18} />
          <span className="font-medium">Settings</span>
        </motion.button>
      </div>
    </div>;
};
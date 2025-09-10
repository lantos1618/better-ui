import React from 'react';
import { Sidebar } from './Sidebar';
import { MainChatArea } from './MainChatArea';
interface ChatData {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}
interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}
interface ChatLayoutProps {
  chats: ChatData[];
  messages: Message[];
  currentChatId: string;
  inputValue: string;
  isTyping: boolean;
  onSendMessage: (content: string) => void;
  onInputChange: (value: string) => void;
  onNewChat: () => void;
  onChatSelect: (chatId: string) => void;
  onSettingsOpen: () => void;
}

// @component: ChatLayout
export const ChatLayout = ({
  chats,
  messages,
  currentChatId,
  inputValue,
  isTyping,
  onSendMessage,
  onInputChange,
  onNewChat,
  onChatSelect,
  onSettingsOpen
}: ChatLayoutProps) => {
  // @return
  return <div className="flex h-full w-full bg-gray-50">
      <Sidebar chats={chats} currentChatId={currentChatId} onNewChat={onNewChat} onChatSelect={onChatSelect} onSettingsOpen={onSettingsOpen} />
      
      <MainChatArea messages={messages} inputValue={inputValue} isTyping={isTyping} onSendMessage={onSendMessage} onInputChange={onInputChange} />
    </div>;
};
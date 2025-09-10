import React, { useState } from 'react';
import { ChatLayout } from './ChatLayout';
import { SettingsModal } from './SettingsModal';
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
const SAMPLE_CHATS: ChatData[] = [{
  id: '1',
  title: 'React Best Practices',
  lastMessage: 'How do I optimize React performance?',
  timestamp: '2 hours ago'
}, {
  id: '2',
  title: 'TypeScript Integration',
  lastMessage: 'Setting up TypeScript with React',
  timestamp: '1 day ago'
}, {
  id: '3',
  title: 'Design System Architecture',
  lastMessage: 'Building scalable component libraries',
  timestamp: '3 days ago'
}];
const SAMPLE_MESSAGES: Message[] = [{
  id: '1',
  type: 'user',
  content: 'How do I create a modern AI chat interface with React?',
  timestamp: '10:30 AM'
}, {
  id: '2',
  type: 'ai',
  content: 'Creating a modern AI chat interface involves several key components and design principles. Here\'s a comprehensive approach:\n\n**Core Components:**\n- Message bubbles with clear user/AI distinction\n- Streaming response indicators\n- Interactive input area with attachment support\n- Sidebar for chat history navigation\n\n**Design Principles:**\n- Clean, minimalist aesthetic\n- Smooth animations and transitions\n- Responsive design for all devices\n- Accessibility-first approach\n\nWould you like me to elaborate on any specific aspect?',
  timestamp: '10:31 AM'
}, {
  id: '3',
  type: 'user',
  content: 'Yes, tell me more about the streaming response implementation.',
  timestamp: '10:32 AM'
}];

// @component: ChatDesignSystemDemo
export const ChatDesignSystemDemo = () => {
  const [currentChatId, setCurrentChatId] = useState<string>('1');
  const [messages, setMessages] = useState<Message[]>(SAMPLE_MESSAGES);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'This is a simulated AI response to demonstrate the chat interface. In a real implementation, this would connect to your AI service.',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        }),
        isStreaming: true
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 2000);
  };
  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(Date.now().toString());
  };
  const handleChatSelect = (chatId: string) => {
    setCurrentChatId(chatId);
    // In a real app, you'd load the messages for this chat
  };

  // @return
  return <div className="h-screen w-full bg-white">
      <ChatLayout chats={SAMPLE_CHATS} messages={messages} currentChatId={currentChatId} inputValue={inputValue} isTyping={isTyping} onSendMessage={handleSendMessage} onInputChange={setInputValue} onNewChat={handleNewChat} onChatSelect={handleChatSelect} onSettingsOpen={() => setIsSettingsOpen(true)} />
      
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </div>;
};
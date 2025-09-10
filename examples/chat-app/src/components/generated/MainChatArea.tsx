import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Copy, RotateCcw, Edit3, User, Bot, Loader2 } from 'lucide-react';
interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}
interface MainChatAreaProps {
  messages: Message[];
  inputValue: string;
  isTyping: boolean;
  onSendMessage: (content: string) => void;
  onInputChange: (value: string) => void;
}

// @component: MainChatArea
export const MainChatArea = ({
  messages,
  inputValue,
  isTyping,
  onSendMessage,
  onInputChange
}: MainChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages, isTyping]);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendMessage(inputValue);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage(inputValue);
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

  // @return
  return <div className="flex-1 flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">AI Assistant</h1>
            <p className="text-sm text-gray-500">Ready to help with your questions</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Online</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <AnimatePresence>
            {messages.map(message => <motion.div key={message.id} initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: -20
          }} className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.type === 'ai' && <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Bot size={16} className="text-blue-600" />
                    </div>
                  </div>}
                
                <div className={`group max-w-2xl ${message.type === 'user' ? 'order-1' : ''}`}>
                  <div className={`px-4 py-3 rounded-2xl ${message.type === 'user' ? 'bg-blue-600 text-white ml-auto' : 'bg-gray-100 text-gray-900'}`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                  
                  <div className={`flex items-center gap-2 mt-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-xs text-gray-500">{message.timestamp}</span>
                    
                    {message.type === 'ai' && <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700">
                          <Copy size={14} />
                        </button>
                        <button className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700">
                          <RotateCcw size={14} />
                        </button>
                      </div>}
                    
                    {message.type === 'user' && <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700">
                          <Edit3 size={14} />
                        </button>
                      </div>}
                  </div>
                </div>

                {message.type === 'user' && <div className="flex-shrink-0 order-2">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <User size={16} className="text-gray-600" />
                    </div>
                  </div>}
              </motion.div>)}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isTyping && <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Bot size={16} className="text-blue-600" />
                </div>
              </div>
              <div className="bg-gray-100 px-4 py-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-gray-500" />
                  <span className="text-gray-500">AI is thinking...</span>
                </div>
              </div>
            </motion.div>}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
              <button type="button" className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
                <Paperclip size={18} />
              </button>
              
              <textarea ref={textareaRef} value={inputValue} onChange={e => onInputChange(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type your message..." className="flex-1 bg-transparent border-none outline-none resize-none min-h-[24px] max-h-[120px] text-gray-900 placeholder-gray-500" rows={1} />
              
              <motion.button type="submit" disabled={!inputValue.trim()} className={`flex-shrink-0 p-2 rounded-lg transition-all ${inputValue.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`} whileHover={inputValue.trim() ? {
              scale: 1.05
            } : {}} whileTap={inputValue.trim() ? {
              scale: 0.95
            } : {}}>
                <Send size={18} />
              </motion.button>
            </div>
          </form>
        </div>
      </div>
    </div>;
};
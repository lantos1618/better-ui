'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  User, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Activity,
  BarChart3,
  Briefcase,
  Newspaper,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { stockTools } from '@/lib/aui-tools';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolResults?: any[];
  toolCalls?: any[];
}

const getToolIcon = (toolName: string) => {
  const iconMap: Record<string, any> = {
    getStockPrice: TrendingUp,
    getPortfolio: Briefcase,
    addToPortfolio: DollarSign,
    removeFromPortfolio: TrendingDown,
    getStockNews: Newspaper,
    getMarketOverview: BarChart3,
    getTechnicalAnalysis: Activity,
  };
  return iconMap[toolName] || AlertCircle;
};

export default function ModernChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: 'Welcome! I\'m your AI stock assistant. I can help you track stocks, manage portfolios, and provide market insights. What would you like to know?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickActions = [
    { label: 'AAPL Price', query: 'Show me AAPL stock price', icon: TrendingUp },
    { label: 'Portfolio', query: 'Show my portfolio', icon: Briefcase },
    { label: 'Market Overview', query: 'Show market overview', icon: BarChart3 },
    { label: 'TSLA News', query: 'Get news for TSLA', icon: Newspaper },
  ];

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const executeTool = async (toolCall: any) => {
    // Map tool names from API to actual tool objects
    const toolMap: Record<string, string> = {
      'getStockPrice': 'stock-price',
      'addToPortfolio': 'portfolio',
      'removeFromPortfolio': 'portfolio',
      'getPortfolio': 'portfolio',
      'getStockNews': 'stock-news',
      'getMarketOverview': 'market-overview'
    };
    
    const toolName = toolMap[toolCall.tool];
    const tool = stockTools.find(t => t.name === toolName);
    if (!tool) return null;

    try {
      // Handle portfolio actions
      let input = toolCall.input;
      if (toolCall.tool === 'addToPortfolio') {
        input = { action: 'add', ...toolCall.input };
      } else if (toolCall.tool === 'removeFromPortfolio') {
        input = { action: 'remove', ...toolCall.input };
      } else if (toolCall.tool === 'getPortfolio') {
        input = { action: 'view' };
      }
      
      const result = await tool.execute(input);
      return { 
        tool: toolCall.tool, 
        result, 
        renderer: tool.render,
        input: toolCall.input
      };
    } catch (error) {
      console.error('Tool execution error:', error);
      return null;
    }
  };

  const handleSubmit = async (e?: React.FormEvent, quickQuery?: string) => {
    e?.preventDefault();
    const messageText = quickQuery || input;
    if (!messageText.trim() || loading) return;

    const userMessage: Message = { 
      id: Date.now().toString(),
      role: 'user', 
      content: messageText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    if (!quickQuery) setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          tools: stockTools.map(t => ({
            name: t.name,
            description: t.description
          }))
        })
      });

      if (response.status === 429) {
        const data = await response.json();
        throw new Error(`Rate limit exceeded. Please wait ${Math.ceil((data.resetTime - Date.now()) / 1000)} seconds.`);
      }

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Execute tool calls
      const toolResults = [];
      if (data.toolCalls && data.toolCalls.length > 0) {
        for (const toolCall of data.toolCalls) {
          const result = await executeTool(toolCall);
          if (result) {
            toolResults.push(result);
          }
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        toolResults,
        toolCalls: data.toolCalls
      };

      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: error.message || 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Stock Chat AI</h1>
              <p className="text-sm text-gray-500">Powered by Gemini AI</p>
            </div>
          </div>
          <Badge variant="outline" className="text-green-600 border-green-600">
            <div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse" />
            Online
          </Badge>
        </div>
      </header>

      {/* Chat Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        <div className="max-w-4xl mx-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' && "flex-row-reverse"
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className={cn(
                  message.role === 'user' 
                    ? "bg-blue-500 text-white" 
                    : message.role === 'system'
                    ? "bg-purple-500 text-white"
                    : "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
                )}>
                  {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              
              <div className={cn(
                "flex flex-col gap-2 max-w-[80%]",
                message.role === 'user' && "items-end"
              )}>
                <Card className={cn(
                  "shadow-sm",
                  message.role === 'user' 
                    ? "bg-blue-500 text-white border-blue-500" 
                    : "bg-white"
                )}>
                  <CardContent className="p-3">
                    <p className={cn(
                      "text-sm whitespace-pre-wrap",
                      message.role === 'user' && "text-white"
                    )}>
                      {message.content}
                    </p>
                  </CardContent>
                </Card>
                
                {/* Tool Results */}
                {message.toolResults && message.toolResults.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {message.toolResults.map((toolResult, index) => {
                      const Icon = getToolIcon(toolResult.tool);
                      return (
                        <Card key={index} className="bg-gradient-to-br from-gray-50 to-white border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Icon className="h-4 w-4 text-gray-600" />
                              <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                                {toolResult.tool.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                            </div>
                            {toolResult.renderer ? (
                              <div className="tool-result-content">
                                {toolResult.renderer({ result: toolResult.result })}
                              </div>
                            ) : (
                              <pre className="text-xs text-gray-700 overflow-auto">
                                {JSON.stringify(toolResult.result, null, 2)}
                              </pre>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
                
                <span className="text-xs text-gray-400 px-2">
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <Card className="bg-white">
                <CardContent className="p-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-500">Thinking...</span>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      {messages.length <= 2 && !loading && (
        <div className="border-t bg-white/80 backdrop-blur px-6 py-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 mr-2">Try:</span>
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSubmit(undefined, action.query)}
                  className="gap-1.5"
                >
                  <action.icon className="h-3 w-3" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t bg-white px-6 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about stocks, portfolios, or market trends..."
              className="flex-1"
              disabled={loading}
            />
            <Button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
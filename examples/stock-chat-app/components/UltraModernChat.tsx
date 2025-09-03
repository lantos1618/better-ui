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
  Loader2,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Hash,
  Clock,
  ChevronUp
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

export default function UltraModernChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: 'Welcome! I\'m your AI-powered financial assistant. I can help you track real-time stock prices, manage your portfolio, and provide market insights. What would you like to explore today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickActions = [
    { label: 'Apple Stock', query: 'Show me AAPL stock price', icon: TrendingUp, color: 'text-green-500' },
    { label: 'My Portfolio', query: 'Show my portfolio', icon: Briefcase, color: 'text-blue-500' },
    { label: 'Market Status', query: 'Show market overview', icon: BarChart3, color: 'text-purple-500' },
    { label: 'Tesla News', query: 'Get news for TSLA', icon: Newspaper, color: 'text-orange-500' },
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
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
      console.error('Chat API error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `❌ ${error.message || 'Sorry, I encountered an error. Please try again.'}`,
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header with glassmorphism effect */}
      <header className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl blur-lg opacity-70 animate-pulse"></div>
              <div className="relative p-2.5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Stock AI Assistant
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                Powered by Gemini AI <Sparkles className="h-3 w-3" />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
              Live Market
            </Badge>
            <Badge variant="outline" className="text-blue-600 border-blue-600/30 bg-blue-50 dark:bg-blue-950/30 px-3 py-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Badge>
          </div>
        </div>
      </header>

      {/* Chat Messages with better styling */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
        <div className="max-w-4xl mx-auto py-6 space-y-4">
          {messages.map((message, idx) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 animate-slideIn",
                message.role === 'user' && "flex-row-reverse"
              )}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <Avatar className={cn(
                "h-10 w-10 shrink-0 shadow-lg",
                message.role === 'user' && "ring-2 ring-blue-500/30"
              )}>
                <AvatarFallback className={cn(
                  message.role === 'user' 
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white" 
                    : message.role === 'system'
                    ? "bg-gradient-to-br from-purple-500 to-pink-600 text-white"
                    : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                )}>
                  {message.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
              
              <div className={cn(
                "flex flex-col gap-2 max-w-[75%]",
                message.role === 'user' && "items-end"
              )}>
                <Card className={cn(
                  "shadow-md transition-all hover:shadow-lg",
                  message.role === 'user' 
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0" 
                    : message.role === 'system'
                    ? "bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200/50 dark:border-purple-800/50"
                    : "bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/50"
                )}>
                  <CardContent className="p-4">
                    <p className={cn(
                      "text-sm whitespace-pre-wrap leading-relaxed",
                      message.role === 'user' && "text-white"
                    )}>
                      {message.content}
                    </p>
                  </CardContent>
                </Card>
                
                {/* Enhanced Tool Results */}
                {message.toolResults && message.toolResults.length > 0 && (
                  <div className="space-y-3 mt-2">
                    {message.toolResults.map((toolResult, index) => {
                      const Icon = getToolIcon(toolResult.tool);
                      return (
                        <Card key={index} className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 border-slate-200/50 dark:border-slate-700/50 shadow-lg overflow-hidden">
                          <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 px-4 py-2 border-b border-slate-200/50 dark:border-slate-700/50">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg">
                                <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                              </div>
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                {toolResult.tool.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              <Badge variant="outline" className="ml-auto text-xs">
                                <Zap className="h-3 w-3 mr-1" />
                                Executed
                              </Badge>
                            </div>
                          </div>
                          <CardContent className="p-4">
                            {toolResult.renderer ? (
                              <div className="tool-result-content">
                                {toolResult.renderer({ result: toolResult.result })}
                              </div>
                            ) : (
                              <pre className="text-xs text-slate-700 dark:text-slate-300 overflow-auto bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                                {JSON.stringify(toolResult.result, null, 2)}
                              </pre>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
                
                <div className="flex items-center gap-2 px-2">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {formatTime(message.timestamp)}
                  </span>
                  {message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0 && (
                    <Badge variant="outline" className="text-xs border-purple-300 text-purple-600 dark:border-purple-700 dark:text-purple-400">
                      <Activity className="h-3 w-3 mr-1" />
                      {message.toolCalls.length} tool{message.toolCalls.length > 1 ? 's' : ''} used
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-3 animate-slideIn">
              <Avatar className="h-10 w-10 shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <Card className="bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/50 shadow-md">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">Analyzing markets...</span>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions - Enhanced */}
      {messages.length <= 2 && !loading && (
        <div className="border-t border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
              <Sparkles className="h-3 w-3" />
              Quick actions
            </p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSubmit(undefined, action.query)}
                  className="gap-2 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/50 dark:border-slate-700/50 transition-all hover:scale-105 hover:shadow-md"
                >
                  <action.icon className={cn("h-3.5 w-3.5", action.color)} />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area - Enhanced */}
      <div className="border-t border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl px-6 py-5">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about stocks, portfolios, market trends, or financial news..."
                className="pr-12 h-12 bg-white/80 dark:bg-slate-900/80 border-slate-200/50 dark:border-slate-700/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                disabled={loading}
              />
              {input && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">Enter</kbd>
                </div>
              )}
            </div>
            <Button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="h-12 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
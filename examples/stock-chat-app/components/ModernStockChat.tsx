'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  Building2,
  Globe,
  LineChart,
  PieChart,
  MessageSquare,
  Settings,
  Info,
  ChevronRight,
  Clock,
  Zap
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
    getStockPrice: LineChart,
    getPortfolio: PieChart,
    addToPortfolio: DollarSign,
    removeFromPortfolio: TrendingDown,
    getStockNews: Newspaper,
    getMarketOverview: Globe,
    getTechnicalAnalysis: Activity,
  };
  return iconMap[toolName] || AlertCircle;
};

export default function ModernStockChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: 'Hi! I\'m your AI stock market assistant. I can help you track stocks, manage your portfolio, and get market insights. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('chat');

  const suggestedPrompts = [
    { text: 'Show me Apple stock', icon: TrendingUp, color: 'hover:bg-green-50 hover:border-green-300' },
    { text: 'What\'s in my portfolio?', icon: Briefcase, color: 'hover:bg-blue-50 hover:border-blue-300' },
    { text: 'Market overview', icon: Globe, color: 'hover:bg-purple-50 hover:border-purple-300' },
    { text: 'Tesla news', icon: Newspaper, color: 'hover:bg-orange-50 hover:border-orange-300' },
  ];

  const marketStats = [
    { label: 'S&P 500', value: '5,845.21', change: '+0.82%', up: true },
    { label: 'NASDAQ', value: '18,452.09', change: '+1.24%', up: true },
    { label: 'DOW', value: '42,156.33', change: '-0.15%', up: false },
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Stock AI</h1>
              <p className="text-xs text-gray-500">Market Assistant</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 m-4 mb-0">
            <TabsTrigger value="chat" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="market" className="text-xs">
              <Globe className="h-3 w-3 mr-1" />
              Market
            </TabsTrigger>
          </TabsList>

          <TabsContent value="market" className="flex-1 p-4 pt-2">
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 mb-3">MARKET INDICES</h3>
                <div className="space-y-2">
                  {marketStats.map((stat) => (
                    <Card key={stat.label} className="p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{stat.label}</span>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{stat.value}</div>
                          <div className={cn(
                            "text-xs flex items-center justify-end",
                            stat.up ? "text-green-600" : "text-red-600"
                          )}>
                            {stat.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {stat.change}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-500 mb-3">QUICK ACTIONS</h3>
                <div className="space-y-2">
                  {suggestedPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSubmit(undefined, prompt.text)}
                      className={cn(
                        "w-full p-3 rounded-lg border border-gray-200 flex items-center gap-2 transition-colors text-left",
                        "hover:bg-gray-50"
                      )}
                    >
                      <prompt.icon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-700">{prompt.text}</span>
                      <ChevronRight className="h-3 w-3 text-gray-400 ml-auto" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="flex-1 p-4 pt-2 overflow-hidden">
            <div className="h-full flex flex-col">
              <h3 className="text-xs font-semibold text-gray-500 mb-3">RECENT CHATS</h3>
              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  <Card className="p-3 bg-blue-50 border-blue-200">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3 w-3 text-blue-600" />
                      <span className="text-sm text-blue-900 font-medium">Current Chat</span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">{messages.length - 1} messages</p>
                  </Card>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Connected</span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-xs">
                    <Zap className="h-3 w-3 mr-1" />
                    Gemini
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Powered by Google Gemini AI</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {new Date().toLocaleDateString()}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ask me about stock prices, portfolios, and market trends</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </header>

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message, idx) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' && "justify-end"
                )}
              >
                {message.role !== 'user' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={cn(
                      "bg-gradient-to-br",
                      message.role === 'system' 
                        ? "from-purple-500 to-pink-500" 
                        : "from-blue-500 to-indigo-500"
                    )}>
                      <Bot className="h-4 w-4 text-white" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={cn(
                  "flex flex-col gap-1 max-w-[80%]",
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
                        "text-sm",
                        message.role === 'user' ? "text-white" : "text-gray-800"
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
                          <Card key={index} className="shadow-md overflow-hidden">
                            <CardHeader className="p-3 bg-gray-50 border-b">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-gray-600" />
                                <span className="text-xs font-semibold text-gray-700">
                                  {toolResult.tool.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                              </div>
                            </CardHeader>
                            <CardContent className="p-3">
                              {toolResult.renderer ? (
                                toolResult.renderer({ result: toolResult.result })
                              ) : (
                                <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto">
                                  {JSON.stringify(toolResult.result, null, 2)}
                                </pre>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                  
                  <span className="text-xs text-gray-500 px-1">
                    {formatTime(message.timestamp)}
                  </span>
                </div>

                {message.role === 'user' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gray-200">
                      <User className="h-4 w-4 text-gray-600" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500">
                    <Bot className="h-4 w-4 text-white" />
                  </AvatarFallback>
                </Avatar>
                <Card className="shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      <span className="text-sm text-gray-500">Thinking...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Suggested Prompts */}
        {messages.length <= 2 && !loading && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div className="max-w-3xl mx-auto">
              <p className="text-xs text-gray-500 mb-2">Suggested</p>
              <div className="flex gap-2 flex-wrap">
                {suggestedPrompts.map((prompt, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSubmit(undefined, prompt.text)}
                    className={cn("gap-1", prompt.color)}
                  >
                    <prompt.icon className="h-3 w-3" />
                    {prompt.text}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
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
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
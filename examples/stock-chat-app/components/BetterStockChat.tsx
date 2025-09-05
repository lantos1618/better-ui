'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
  Plus,
  Settings,
  Info,
  ChevronRight,
  Clock,
  Zap,
  Menu,
  Moon,
  Sun,
  Search,
  BookOpen,
  Shield,
  Bell,
  Mic,
  Paperclip,
  Hash,
  Target,
  Rocket,
  Brain,
  RefreshCw,
  Star,
  History
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
  isStreaming?: boolean;
}

interface MarketIndex {
  name: string;
  symbol: string;
  value: string;
  change: string;
  changePercent: string;
  isUp: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  query: string;
  icon: any;
  color: string;
  description: string;
}

const marketIndices: MarketIndex[] = [
  { name: 'S&P 500', symbol: 'SPX', value: '5,845.21', change: '+48.15', changePercent: '+0.82%', isUp: true },
  { name: 'NASDAQ', symbol: 'NDX', value: '18,452.09', change: '+226.42', changePercent: '+1.24%', isUp: true },
  { name: 'DOW', symbol: 'DJI', value: '42,156.33', change: '-63.21', changePercent: '-0.15%', isUp: false },
  { name: 'Russell 2000', symbol: 'RUT', value: '2,234.67', change: '+12.45', changePercent: '+0.56%', isUp: true },
];

const quickActions: QuickAction[] = [
  { id: '1', label: 'Top Gainers', query: 'Show me today\'s top gaining stocks', icon: TrendingUp, color: 'text-green-600 bg-green-50', description: 'See today\'s best performers' },
  { id: '2', label: 'Portfolio Health', query: 'Analyze my portfolio performance', icon: Activity, color: 'text-blue-600 bg-blue-50', description: 'Get insights on your holdings' },
  { id: '3', label: 'Market News', query: 'What\'s happening in the markets today?', icon: Newspaper, color: 'text-purple-600 bg-purple-50', description: 'Latest market updates' },
  { id: '4', label: 'Tech Stocks', query: 'Show me tech sector performance', icon: Rocket, color: 'text-indigo-600 bg-indigo-50', description: 'Technology sector analysis' },
  { id: '5', label: 'AI Insights', query: 'Give me AI-powered market predictions', icon: Brain, color: 'text-pink-600 bg-pink-50', description: 'AI market analysis' },
  { id: '6', label: 'Risk Analysis', query: 'Analyze my portfolio risk', icon: Shield, color: 'text-orange-600 bg-orange-50', description: 'Risk assessment' },
];

const getToolIcon = (toolName: string) => {
  const iconMap: Record<string, any> = {
    getStockPrice: LineChart,
    getPortfolio: PieChart,
    addToPortfolio: Plus,
    removeFromPortfolio: TrendingDown,
    getStockNews: Newspaper,
    getMarketOverview: Globe,
    getTechnicalAnalysis: Activity,
  };
  return iconMap[toolName] || AlertCircle;
};

export default function BetterStockChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Welcome! I\'m your AI-powered stock market assistant. I can help you track stocks, analyze portfolios, and provide real-time market insights. What would you like to explore today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const simulateTyping = (text: string, messageId: string) => {
    let index = 0;
    setIsTyping(true);
    
    const interval = setInterval(() => {
      if (index < text.length) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: text.slice(0, index + 1), isStreaming: true }
            : msg
        ));
        index++;
      } else {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isStreaming: false }
            : msg
        ));
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 20);
  };

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
        content: '',
        timestamp: new Date(),
        toolResults,
        toolCalls: data.toolCalls
      };

      setMessages(prev => [...prev, assistantMessage]);
      simulateTyping(data.content, assistantMessage.id);
      
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
    <div className={cn("flex h-screen bg-gradient-to-br", darkMode ? "from-gray-900 via-gray-800 to-gray-900" : "from-slate-50 via-white to-blue-50")}>
      {/* Sidebar */}
      <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
        <SheetContent side="left" className="w-[320px] p-0 border-r-2">
          <div className="h-full flex flex-col bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
            {/* Header */}
            <div className="p-6 border-b bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                    <LineChart className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      StockAI Pro
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Powered by Gemini</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDarkMode(!darkMode)}
                  className="rounded-full"
                >
                  {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
              
              {/* Market Indices */}
              <div className="space-y-2">
                {marketIndices.map((index) => (
                  <div key={index.symbol} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{index.name}</p>
                        <p className="text-lg font-semibold">{index.value}</p>
                      </div>
                      <div className={cn(
                        "text-right",
                        index.isUp ? "text-green-600" : "text-red-600"
                      )}>
                        <div className="flex items-center gap-1">
                          {index.isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          <span className="text-sm font-medium">{index.change}</span>
                        </div>
                        <span className="text-xs">{index.changePercent}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Quick Actions
                  </h3>
                  <div className="space-y-2">
                    {quickActions.map((action) => (
                      <TooltipProvider key={action.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full justify-start gap-3 hover:scale-[1.02] transition-all",
                                action.color
                              )}
                              onClick={() => handleSubmit(undefined, action.query)}
                            >
                              <action.icon className="h-4 w-4" />
                              <span className="text-sm font-medium">{action.label}</span>
                              <ChevronRight className="h-3 w-3 ml-auto opacity-50" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{action.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </div>

                {/* Chat History */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Recent Conversations
                  </h3>
                  <Card className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-600 rounded">
                          <Activity className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm font-medium">Current Session</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {messages.length} messages
                      </Badge>
                    </div>
                  </Card>
                </div>
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-4 border-t bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={voiceEnabled}
                    onCheckedChange={setVoiceEnabled}
                  />
                  <Label htmlFor="voice" className="text-sm">Voice Input</Label>
                </div>
                <Badge variant="outline" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Secure
                </Badge>
              </div>
              <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200">
                <Sparkles className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  AI-powered analysis with real-time market data
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(true)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Live Market Data
                </Badge>
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date().toLocaleString('en-US', { 
                    weekday: 'short', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Bell className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Market Alerts</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Settings</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </header>

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-4 animate-in slide-in-from-bottom-2",
                  message.role === 'user' && "justify-end"
                )}
              >
                {message.role !== 'user' && (
                  <Avatar className="h-10 w-10 border-2 border-white shadow-lg">
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600">
                      <Bot className="h-5 w-5 text-white" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={cn(
                  "flex flex-col gap-2 max-w-[85%]",
                  message.role === 'user' && "items-end"
                )}>
                  <Card className={cn(
                    "shadow-lg border-0",
                    message.role === 'user' 
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white" 
                      : "bg-white dark:bg-gray-800"
                  )}>
                    <CardContent className="p-4">
                      <div className={cn(
                        "text-sm",
                        message.role === 'user' ? "text-white" : "text-gray-800 dark:text-gray-200"
                      )}>
                        {message.isStreaming ? (
                          <>
                            {message.content}
                            <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />
                          </>
                        ) : (
                          message.content
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Tool Results */}
                  {message.toolResults && message.toolResults.length > 0 && (
                    <div className="space-y-3">
                      {message.toolResults.map((toolResult, index) => {
                        const Icon = getToolIcon(toolResult.tool);
                        return (
                          <Card key={index} className="shadow-xl overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                            <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow">
                                  <Icon className="h-4 w-4 text-blue-600" />
                                </div>
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  {toolResult.tool.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <Badge variant="secondary" className="ml-auto text-xs">
                                  Live Data
                                </Badge>
                              </div>
                            </div>
                            <CardContent className="p-4">
                              {toolResult.renderer ? (
                                toolResult.renderer({ result: toolResult.result })
                              ) : (
                                <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg overflow-auto">
                                  {JSON.stringify(toolResult.result, null, 2)}
                                </pre>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                  
                  <span className="text-xs text-gray-500 dark:text-gray-400 px-2">
                    {formatTime(message.timestamp)}
                  </span>
                </div>

                {message.role === 'user' && (
                  <Avatar className="h-10 w-10 border-2 border-white shadow-lg">
                    <AvatarFallback className="bg-gradient-to-br from-gray-200 to-gray-300">
                      <User className="h-5 w-5 text-gray-700" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {(loading || isTyping) && (
              <div className="flex gap-4">
                <Avatar className="h-10 w-10 border-2 border-white shadow-lg">
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600">
                    <Bot className="h-5 w-5 text-white" />
                  </AvatarFallback>
                </Avatar>
                <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm text-gray-500">Analyzing markets...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t px-6 py-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about stocks, portfolios, market trends..."
                    className="pr-24 pl-12 py-6 text-base rounded-2xl border-2 focus:border-blue-500 transition-colors"
                    disabled={loading}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {voiceEnabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-8 w-8"
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-8 w-8"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={loading || !input.trim()}
                  className="px-6 py-6 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all hover:scale-105"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
              {!loading && input.length === 0 && (
                <div className="absolute -top-12 left-0 right-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Press <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">Enter</kbd> to send or try a quick action
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Add Label component import
function Label({ children, htmlFor, className }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  );
}
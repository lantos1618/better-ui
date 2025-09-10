import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/rate-limiter';

// Type definitions
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
}

interface ChatRequest {
  messages: ChatMessage[];
  tools?: boolean;
}

// Initialize rate limiter with very strict limits for public deployment
const rateLimiter = new RateLimiter(
  parseInt(process.env.NEXT_PUBLIC_API_RATE_LIMIT || '3'), // Strict limit: 3 requests per minute
  parseInt(process.env.NEXT_PUBLIC_API_RATE_WINDOW || '60000')
);

// Initialize Gemini with environment variable API key
if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set in environment variables');
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    // Rate limiting based on IP
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
    
    const rateLimitResult = rateLimiter.check(ip);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          resetTime: rateLimitResult.resetTime 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': process.env.NEXT_PUBLIC_API_RATE_LIMIT || '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          }
        }
      );
    }
    
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured. Please set GEMINI_API_KEY environment variable.' },
        { status: 500 }
      );
    }
    
    const { messages, tools }: ChatRequest = await req.json();
    
    // Get the Gemini model (function calling will be added in future version)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      }
    });
    
    // Format messages for Gemini - filter out system messages and ensure alternating roles
    const filteredMessages = messages.slice(0, -1).filter((msg) => msg.role !== 'system');
    const history: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    
    // Ensure history starts with a user message and alternates properly
    for (let i = 0; i < filteredMessages.length; i++) {
      const msg = filteredMessages[i];
      const role = msg.role === 'user' ? 'user' : 'model';
      
      // Skip if we have consecutive messages from the same role
      if (history.length > 0 && history[history.length - 1].role === role) {
        continue;
      }
      
      history.push({
        role,
        parts: [{ text: msg.content }]
      });
    }
    
    // Ensure history starts with 'user' role if it exists
    if (history.length > 0 && history[0].role === 'model') {
      history.shift(); // Remove the first model message if it starts the conversation
    }
    
    const lastMessage = messages[messages.length - 1];
    
    // Create chat session
    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });
    
    // Add context about available tools
    const toolContext = tools ? `
You are a helpful financial assistant with access to these tools:
- stock-price: Get real-time stock prices (use format: "Check stock price for [SYMBOL]")
- portfolio: Manage stock portfolio (use format: "Add/Remove [SYMBOL] to portfolio")
- stock-news: Get latest news for stocks (use format: "Get news for [SYMBOL]")
- market-overview: Get market overview (use format: "Show market overview")

When users ask about stocks, suggest using these tools by including the tool commands in your response.
` : '';
    
    // Send message with context
    const contextMessage = toolContext + lastMessage.content;
    const result = await chat.sendMessage(contextMessage);
    const response = result.response;
    const text = response.text();
    
    // Parse tool calls from response text using pattern matching
    const toolCalls: ToolCall[] = [];
    
    // Check for stock price requests
    const pricePatterns = [
      /(?:price|quote|value|cost|show|get).*?\b([A-Z]{1,5})\b/gi,
      /\b([A-Z]{1,5})\b.*?(?:price|quote|stock)/gi
    ];
    
    for (const pattern of pricePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        const symbolMatch = matches[0].match(/\b([A-Z]{1,5})\b/);
        if (symbolMatch) {
          toolCalls.push({
            tool: 'getStockPrice',
            input: { symbol: symbolMatch[0], showChart: true }
          });
          break;
        }
      }
    }
    
    // Check for portfolio requests
    if (text.toLowerCase().includes('portfolio')) {
      const addMatch = text.match(/add\s+(\w+)/i);
      const removeMatch = text.match(/remove\s+(\w+)/i);
      
      if (addMatch && addMatch[1].length <= 5) {
        toolCalls.push({
          tool: 'addToPortfolio',
          input: { symbol: addMatch[1].toUpperCase(), shares: 100 }
        });
      } else if (removeMatch && removeMatch[1].length <= 5) {
        toolCalls.push({
          tool: 'removeFromPortfolio',
          input: { symbol: removeMatch[1].toUpperCase() }
        });
      } else {
        toolCalls.push({
          tool: 'getPortfolio',
          input: {}
        });
      }
    }
    
    // Check for news requests
    const newsMatch = text.match(/news.*?\b([A-Z]{1,5})\b/i);
    if (newsMatch && newsMatch[1]) {
      toolCalls.push({
        tool: 'getStockNews',
        input: { symbol: newsMatch[1].toUpperCase(), limit: 5 }
      });
    }
    
    // Check for market overview
    if (text.toLowerCase().includes('market') && (text.toLowerCase().includes('overview') || text.toLowerCase().includes('summary'))) {
      toolCalls.push({
        tool: 'getMarketOverview',
        input: {}
      });
    }
    
    return NextResponse.json(
      {
        content: text,
        toolCalls
      },
      {
        headers: {
          'X-RateLimit-Limit': process.env.NEXT_PUBLIC_API_RATE_LIMIT || '10',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        }
      }
    );
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
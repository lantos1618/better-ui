import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Gemini with the provided API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyCGCPgt4Dw635kw6MDgVTepwGvHPM_HqYE');

export async function POST(req: Request) {
  try {
    const { messages, tools } = await req.json();
    
    // Get the Gemini model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      }
    });
    
    // Format messages for Gemini
    const history = messages.slice(0, -1).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));
    
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
    
    // Send message with tool context
    const result = await chat.sendMessage(toolContext + lastMessage.content);
    const response = await result.response;
    const text = response.text();
    
    // Parse for tool calls (simple pattern matching for demo)
    const toolCalls = [];
    
    if (text.toLowerCase().includes('stock price') || text.toLowerCase().includes('price of')) {
      const symbolMatch = text.match(/\b[A-Z]{1,5}\b/);
      if (symbolMatch) {
        toolCalls.push({
          tool: 'stock-price',
          input: { symbol: symbolMatch[0], showChart: false }
        });
      }
    }
    
    if (text.toLowerCase().includes('portfolio')) {
      const addMatch = text.match(/add\s+(\w+)/i);
      const removeMatch = text.match(/remove\s+(\w+)/i);
      
      if (addMatch) {
        toolCalls.push({
          tool: 'portfolio',
          input: { action: 'add', symbol: addMatch[1].toUpperCase(), shares: 100 }
        });
      } else if (removeMatch) {
        toolCalls.push({
          tool: 'portfolio',
          input: { action: 'remove', symbol: removeMatch[1].toUpperCase() }
        });
      } else {
        toolCalls.push({
          tool: 'portfolio',
          input: { action: 'view' }
        });
      }
    }
    
    if (text.toLowerCase().includes('news')) {
      const symbolMatch = text.match(/news\s+(?:for\s+)?(\w+)/i);
      if (symbolMatch && symbolMatch[1].length <= 5) {
        toolCalls.push({
          tool: 'stock-news',
          input: { symbol: symbolMatch[1].toUpperCase() }
        });
      }
    }
    
    if (text.toLowerCase().includes('market overview')) {
      toolCalls.push({
        tool: 'market-overview',
        input: {}
      });
    }
    
    return NextResponse.json({
      content: text,
      toolCalls
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
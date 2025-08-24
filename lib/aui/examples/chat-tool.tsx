import React from 'react';
import aui, { z } from '../index';

// AI chat tool with streaming support
const chatTool = aui
  .tool('chat')
  .description('Chat with AI assistant')
  .input(z.object({
    message: z.string(),
    conversationId: z.string().optional(),
    model: z.enum(['gpt-4', 'claude', 'llama']).optional().default('gpt-4')
  }))
  .execute(async ({ input }) => {
    // Server: Call AI API
    const response = {
      reply: `I received your message: "${input.message}"`,
      conversationId: input.conversationId || `conv-${Date.now()}`,
      model: input.model,
      tokens: input.message.length * 2
    };
    return response;
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client: Optimistic UI with streaming
    const tempResponse = {
      reply: '...',
      conversationId: input.conversationId || `conv-${Date.now()}`,
      model: input.model,
      status: 'thinking'
    };
    
    // Stream response
    const response = await ctx.fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    
    return { ...response, status: 'complete' };
  })
  .render(({ data, input }) => (
    <div className="chat-message space-y-3">
      <div className="user-message p-3 bg-blue-50 rounded-lg">
        <p className="text-sm font-medium text-blue-900">You</p>
        <p>{input.message}</p>
      </div>
      <div className="ai-message p-3 bg-gray-50 rounded-lg">
        <p className="text-sm font-medium text-gray-900">
          AI ({data.model})
          {data.status && <span className="ml-2 text-xs text-gray-500">{data.status}</span>}
        </p>
        <p>{data.reply}</p>
        {data.tokens && (
          <p className="text-xs text-gray-400 mt-1">Tokens: {data.tokens}</p>
        )}
      </div>
    </div>
  ))
  .build();

export default chatTool;
/**
 * Tests for /api/chat route
 */

import { POST } from '../route';
import { tools } from '@/lib/tools';
import { createMockRequest, expectResponse } from '@/app/__tests__/helpers/test-utils';

// Mock the AI SDK
jest.mock('ai', () => ({
  streamText: jest.fn(),
  convertToModelMessages: jest.fn((messages) => messages),
  stepCountIs: jest.fn((count) => ({ type: 'step-count', count })),
}));

jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mock-model'),
}));

describe('/api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('processes messages and returns streaming response', async () => {
    const { streamText } = require('ai');
    const mockStream = {
      toUIMessageStreamResponse: jest.fn(() => new Response('stream-data')),
    };
    streamText.mockResolvedValue(mockStream);

    const req = createMockRequest({
      messages: [
        { role: 'user', content: 'What is the weather in London?' },
      ],
    });

    const response = await POST(req);

    expect(streamText).toHaveBeenCalled();
    expect(response).toBeDefined();
  });

  it('converts messages using convertToModelMessages', async () => {
    const { streamText, convertToModelMessages } = require('ai');
    const mockStream = {
      toUIMessageStreamResponse: jest.fn(() => new Response('stream-data')),
    };
    streamText.mockResolvedValue(mockStream);

    const messages = [
      { role: 'user', content: 'Hello' },
    ];

    const req = createMockRequest({ messages });

    await POST(req);

    expect(convertToModelMessages).toHaveBeenCalledWith(messages);
  });

  it('includes tools in streamText call', async () => {
    const { streamText } = require('ai');
    const mockStream = {
      toUIMessageStreamResponse: jest.fn(() => new Response('stream-data')),
    };
    streamText.mockResolvedValue(mockStream);

    const req = createMockRequest({
      messages: [{ role: 'user', content: 'test' }],
    });

    await POST(req);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: {
          weather: expect.any(Object),
          search: expect.any(Object),
          counter: expect.any(Object),
          artifact: expect.any(Object),
          navigate: expect.any(Object),
          setTheme: expect.any(Object),
        },
      })
    );
  });

  it('uses toAITool() for each tool', async () => {
    const { streamText } = require('ai');
    const mockStream = {
      toUIMessageStreamResponse: jest.fn(() => new Response('stream-data')),
    };
    streamText.mockResolvedValue(mockStream);

    const weatherSpy = jest.spyOn(tools.weather, 'toAITool');
    const searchSpy = jest.spyOn(tools.search, 'toAITool');
    const counterSpy = jest.spyOn(tools.counter, 'toAITool');

    const req = createMockRequest({
      messages: [{ role: 'user', content: 'test' }],
    });

    await POST(req);

    expect(weatherSpy).toHaveBeenCalled();
    expect(searchSpy).toHaveBeenCalled();
    expect(counterSpy).toHaveBeenCalled();

    weatherSpy.mockRestore();
    searchSpy.mockRestore();
    counterSpy.mockRestore();
  });

  it('configures stopWhen with stepCountIs(5)', async () => {
    const { streamText, stepCountIs } = require('ai');
    const mockStream = {
      toUIMessageStreamResponse: jest.fn(() => new Response('stream-data')),
    };
    streamText.mockResolvedValue(mockStream);

    const req = createMockRequest({
      messages: [{ role: 'user', content: 'test' }],
    });

    await POST(req);

    expect(stepCountIs).toHaveBeenCalledWith(5);
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        stopWhen: expect.any(Object),
      })
    );
  });

  it('handles errors gracefully', async () => {
    const { streamText } = require('ai');
    streamText.mockRejectedValue(new Error('AI service error'));

    const req = createMockRequest({
      messages: [{ role: 'user', content: 'test' }],
    });

    await expect(POST(req)).rejects.toThrow();
  });
});


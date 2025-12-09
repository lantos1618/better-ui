/**
 * High-signal tests for demo page
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatDemo from '../page';

// Mock the AI SDK hooks
jest.mock('@ai-sdk/react', () => ({
  useChat: jest.fn(() => ({
    messages: [],
    sendMessage: jest.fn(),
    status: 'idle',
    addToolOutput: jest.fn(),
  })),
}));

// Mock AI SDK utilities
jest.mock('ai', () => ({
  DefaultChatTransport: jest.fn().mockImplementation(() => ({})),
  isTextUIPart: (part: any) => part?.type === 'text',
  isToolOrDynamicToolUIPart: (part: any) =>
    part?.type === 'tool' || part?.type === 'dynamic-tool',
  getToolOrDynamicToolName: (part: any) => part?.toolName || part?.tool?.name,
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('ChatDemo (value tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ result: { temp: 20, city: 'London', condition: 'sunny' } }),
    });
  });

  it('submits a message and clears input', async () => {
    const mockSendMessage = jest.fn();
    const { useChat } = require('@ai-sdk/react');
    useChat.mockReturnValue({
      messages: [],
      sendMessage: mockSendMessage,
      status: 'idle',
      addToolOutput: jest.fn(),
    });

    render(<ChatDemo />);
    const input = screen.getByPlaceholderText('Ask something...') as HTMLInputElement;
    const form = input.closest('form');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'What is the weather?' } });
      fireEvent.submit(form!);
    });

    expect(mockSendMessage).toHaveBeenCalledWith({ text: 'What is the weather?' });
    expect(input.value).toBe('');
  });

  it('executes a tool action and wires addToolOutput', async () => {
    const mockAddToolOutput = jest.fn();
    const { useChat } = require('@ai-sdk/react');
    useChat.mockReturnValue({
      messages: [
        {
          id: '1',
          role: 'assistant',
          parts: [
            {
              type: 'tool',
              toolName: 'counter',
              toolCallId: 'call-1',
              state: 'output-available',
              output: { name: 'test', value: 5, action: 'get', previousValue: 5 },
            },
          ],
        },
      ],
      sendMessage: jest.fn(),
      status: 'idle',
      addToolOutput: mockAddToolOutput,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ result: { name: 'test', value: 6, action: 'increment', previousValue: 5 } }),
    });

    render(<ChatDemo />);

    await waitFor(() => expect(screen.getByText('test')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('+1'));
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'counter',
          input: { name: 'test', action: 'increment', amount: 1 },
        }),
      });
    });

    await waitFor(() => {
      expect(mockAddToolOutput).toHaveBeenCalledWith({
        tool: 'counter',
        toolCallId: 'call-1',
        output: { name: 'test', value: 6, action: 'increment', previousValue: 5 },
      });
    });
  });

  it('surfaces tool execution errors (logged)', async () => {
    const { useChat } = require('@ai-sdk/react');
    useChat.mockReturnValue({
      messages: [
        {
          id: '1',
          role: 'assistant',
          parts: [
            {
              type: 'tool',
              toolName: 'counter',
              toolCallId: 'call-1',
              state: 'output-available',
              output: { name: 'test', value: 5, action: 'get', previousValue: 5 },
            },
          ],
        },
      ],
      sendMessage: jest.fn(),
      status: 'idle',
      addToolOutput: jest.fn(),
    });

    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<ChatDemo />);

    await waitFor(() => expect(screen.getByText('test')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('+1'));
    });

    await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    consoleSpy.mockRestore();
  });

  it('handles unknown tools gracefully', () => {
    const { useChat } = require('@ai-sdk/react');
    useChat.mockReturnValue({
      messages: [
        {
          id: '1',
          role: 'assistant',
          parts: [
            {
              type: 'tool',
              toolName: 'unknown-tool',
              toolCallId: 'call-1',
              state: 'output-available',
              output: {},
            },
          ],
        },
      ],
      sendMessage: jest.fn(),
      status: 'idle',
      addToolOutput: jest.fn(),
    });

    render(<ChatDemo />);
    expect(screen.getByText(/Unknown tool: unknown-tool/)).toBeInTheDocument();
  });
});


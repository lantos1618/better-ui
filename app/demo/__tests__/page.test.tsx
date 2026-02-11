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

// Mock react-markdown to avoid ESM issues in Jest
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: { children: string }) {
    return <div data-testid="markdown">{children}</div>;
  };
});

jest.mock('remark-gfm', () => () => {});

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

  it('renders suggestion chips in empty state', () => {
    const { useChat } = require('@ai-sdk/react');
    useChat.mockReturnValue({
      messages: [],
      sendMessage: jest.fn(),
      status: 'idle',
      addToolOutput: jest.fn(),
    });

    render(<ChatDemo />);

    expect(screen.getByText("What's the weather in Tokyo?")).toBeInTheDocument();
    expect(screen.getByText("Create a counter called score")).toBeInTheDocument();
    expect(screen.getByText("Search for React hooks")).toBeInTheDocument();
    expect(screen.getByText("Send an email to alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Plan: get weather in Tokyo, check AAPL stock, and email results to alice@example.com")).toBeInTheDocument();
  });

  it('clicking a suggestion calls sendMessage', async () => {
    const mockSendMessage = jest.fn();
    const { useChat } = require('@ai-sdk/react');
    useChat.mockReturnValue({
      messages: [],
      sendMessage: mockSendMessage,
      status: 'idle',
      addToolOutput: jest.fn(),
    });

    render(<ChatDemo />);

    await act(async () => {
      fireEvent.click(screen.getByText("What's the weather in Tokyo?"));
    });

    expect(mockSendMessage).toHaveBeenCalledWith({ text: "What's the weather in Tokyo?" });
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

  it('executes a tool action and updates via store (no addToolOutput)', async () => {
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

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ result: { name: 'test', value: 6, action: 'increment', previousValue: 5 } }),
    });

    render(<ChatDemo />);

    await waitFor(() => expect(screen.getAllByText('test').length).toBeGreaterThan(0));

    await act(async () => {
      fireEvent.click(screen.getAllByText('+1')[0]);
    });

    // Verify the API was called
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

    // No addToolOutput call — the store handles state updates in-place
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

    await waitFor(() => expect(screen.getAllByText('test').length).toBeGreaterThan(0));

    await act(async () => {
      fireEvent.click(screen.getAllByText('+1')[0]);
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

  // ============================================
  // HITL (Human-in-the-Loop) Tests
  // ============================================

  it('HITL tool renders confirmation card (not auto-executed)', () => {
    const { useChat } = require('@ai-sdk/react');
    useChat.mockReturnValue({
      messages: [
        {
          id: '1',
          role: 'assistant',
          parts: [
            {
              type: 'tool',
              toolName: 'sendEmail',
              toolCallId: 'call-hitl-1',
              state: 'input-available',
              input: { to: 'alice@example.com', subject: 'Hello', body: 'Hi there' },
            },
          ],
        },
      ],
      sendMessage: jest.fn(),
      status: 'idle',
      addToolOutput: jest.fn(),
    });

    render(<ChatDemo />);

    // Should show confirmation card with tool name
    expect(screen.getByText(/sendEmail requires confirmation/)).toBeInTheDocument();
    // Should show the proposed input
    expect(screen.getByText(/alice@example.com/)).toBeInTheDocument();
    // Should have Approve and Reject buttons
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('clicking Approve executes the tool and calls addToolOutput', async () => {
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
              toolName: 'sendEmail',
              toolCallId: 'call-hitl-2',
              state: 'input-available',
              input: { to: 'bob@example.com', subject: 'Test', body: 'Body text' },
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
      json: async () => ({ result: { to: 'bob@example.com', subject: 'Test', status: 'sent' } }),
    });

    render(<ChatDemo />);

    await act(async () => {
      fireEvent.click(screen.getByText('Approve'));
    });

    // Should call the confirm API (not execute) for HITL tools
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tools/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'sendEmail',
          input: { to: 'bob@example.com', subject: 'Test', body: 'Body text' },
        }),
      });
    });

    // Should feed result back to AI
    await waitFor(() => {
      expect(mockAddToolOutput).toHaveBeenCalledWith({
        state: 'output-available',
        tool: 'sendEmail',
        toolCallId: 'call-hitl-2',
        output: { to: 'bob@example.com', subject: 'Test', status: 'sent' },
      });
    });
  });

  it('clicking Reject shows rejected state and calls addToolOutput with error', async () => {
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
              toolName: 'sendEmail',
              toolCallId: 'call-hitl-3',
              state: 'input-available',
              input: { to: 'carol@example.com', subject: 'Spam', body: 'Nope' },
            },
          ],
        },
      ],
      sendMessage: jest.fn(),
      status: 'idle',
      addToolOutput: mockAddToolOutput,
    });

    render(<ChatDemo />);

    await act(async () => {
      fireEvent.click(screen.getByText('Reject'));
    });

    // Should show rejected badge
    await waitFor(() => {
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });

    // Should notify AI of rejection
    expect(mockAddToolOutput).toHaveBeenCalledWith({
      state: 'output-error',
      tool: 'sendEmail',
      toolCallId: 'call-hitl-3',
      errorText: 'User rejected this action',
    });
  });
});

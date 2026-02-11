'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';

interface Thread {
  id: string;
  title: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export default function ChatPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const { messages, input, handleInputChange, handleSubmit, setMessages } = useChat({
    api: '/api/chat',
    body: { threadId: activeThreadId },
  });

  const loadThreads = useCallback(async () => {
    const res = await fetch('/api/threads');
    const data = await res.json();
    setThreads(data);
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const createThread = async () => {
    const res = await fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Chat' }),
    });
    const thread = await res.json();
    setThreads((prev) => [thread, ...prev]);
    setActiveThreadId(thread.id);
    setMessages([]);
  };

  const selectThread = async (threadId: string) => {
    setActiveThreadId(threadId);
    const res = await fetch(`/api/chat?threadId=${threadId}`);
    const savedMessages = await res.json();
    setMessages(
      savedMessages.map((m: { id: string; role: string; content: string }) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
    );
  };

  const deleteThread = async (threadId: string) => {
    await fetch(`/api/threads?id=${threadId}`, { method: 'DELETE' });
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    if (activeThreadId === threadId) {
      setActiveThreadId(null);
      setMessages([]);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <div style={{ width: '260px', borderRight: '1px solid #222', padding: '16px', display: 'flex', flexDirection: 'column' }}>
        <button
          onClick={createThread}
          style={{
            width: '100%', padding: '10px', background: '#222', color: '#eee',
            border: '1px solid #333', borderRadius: '6px', cursor: 'pointer',
            marginBottom: '16px', fontSize: '14px',
          }}
        >
          + New Chat
        </button>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {threads.map((thread) => (
            <div
              key={thread.id}
              onClick={() => selectThread(thread.id)}
              style={{
                padding: '10px', borderRadius: '6px', cursor: 'pointer',
                marginBottom: '4px', fontSize: '14px',
                background: activeThreadId === thread.id ? '#333' : 'transparent',
                color: activeThreadId === thread.id ? '#fff' : '#999',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {thread.title || 'Untitled'}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteThread(thread.id); }}
                style={{
                  background: 'none', border: 'none', color: '#666',
                  cursor: 'pointer', fontSize: '16px', padding: '0 4px',
                }}
              >
                x
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeThreadId ? (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    marginBottom: '16px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: m.role === 'user' ? '#1a2a1a' : '#1a1a2a',
                    maxWidth: '80%',
                    marginLeft: m.role === 'user' ? 'auto' : '0',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                    {m.role}
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleSubmit}
              style={{ padding: '16px', borderTop: '1px solid #222', display: 'flex', gap: '8px' }}
            >
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Type a message..."
                style={{
                  flex: 1, padding: '12px', background: '#111', border: '1px solid #333',
                  borderRadius: '8px', color: '#eee', fontSize: '14px', outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '12px 24px', background: '#2563eb', color: '#fff',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
                }}
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>Better UI + Drizzle</div>
              <div style={{ fontSize: '14px' }}>Create a new chat or select an existing one</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

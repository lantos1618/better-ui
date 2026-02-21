import type { PersistenceAdapter, Thread } from '@lantos1618/better-ui/persistence';
import type { UIMessage } from 'ai';

/**
 * Fetch-based persistence adapter that calls server-side API routes.
 */
export function createFetchPersistence(): PersistenceAdapter {
  return {
    async listThreads(): Promise<Thread[]> {
      const res = await fetch('/api/threads');
      if (!res.ok) throw new Error('Failed to list threads');
      const data = await res.json();
      return data.map(parseThread);
    },

    async getThread(id: string): Promise<Thread | null> {
      const threads = await this.listThreads();
      return threads.find((t) => t.id === id) ?? null;
    },

    async createThread(title?: string): Promise<Thread> {
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Failed to create thread');
      return parseThread(await res.json());
    },

    async deleteThread(id: string): Promise<void> {
      const res = await fetch(`/api/threads?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete thread');
    },

    async getMessages(threadId: string): Promise<UIMessage[]> {
      const res = await fetch(`/api/threads/${encodeURIComponent(threadId)}/messages`);
      if (!res.ok) throw new Error('Failed to get messages');
      return res.json();
    },

    async saveMessages(threadId: string, messages: UIMessage[]): Promise<void> {
      const res = await fetch(`/api/threads/${encodeURIComponent(threadId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      if (!res.ok) throw new Error('Failed to save messages');
    },
  };
}

function parseThread(raw: any): Thread {
  return {
    id: raw.id,
    title: raw.title,
    createdAt: new Date(raw.createdAt ?? raw.created_at),
    updatedAt: new Date(raw.updatedAt ?? raw.updated_at),
  };
}

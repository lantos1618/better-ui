import type { UIMessage } from 'ai';
import type { PersistenceAdapter, Thread } from './types';

/**
 * In-memory persistence adapter.
 * Useful for development and testing. Data is lost on page refresh.
 */
export function createMemoryAdapter(): PersistenceAdapter {
  const threads = new Map<string, Thread>();
  const messages = new Map<string, UIMessage[]>();
  let counter = 0;

  return {
    async listThreads() {
      return Array.from(threads.values())
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    },

    async getThread(id: string) {
      return threads.get(id) ?? null;
    },

    async createThread(title?: string) {
      const id = `thread-${++counter}`;
      const now = new Date();
      const thread: Thread = { id, title, createdAt: now, updatedAt: now };
      threads.set(id, thread);
      messages.set(id, []);
      return thread;
    },

    async deleteThread(id: string) {
      threads.delete(id);
      messages.delete(id);
    },

    async getMessages(threadId: string) {
      return messages.get(threadId) ?? [];
    },

    async saveMessages(threadId: string, msgs: UIMessage[]) {
      messages.set(threadId, msgs);
      const thread = threads.get(threadId);
      if (thread) {
        thread.updatedAt = new Date();
      }
    },
  };
}

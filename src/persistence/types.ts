import type { UIMessage } from 'ai';

/**
 * Thread metadata.
 */
export interface Thread {
  id: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Persistence adapter interface.
 * Implement this to store chat threads and messages.
 */
export interface PersistenceAdapter {
  /** List all threads, ordered by most recently updated */
  listThreads(): Promise<Thread[]>;
  /** Get a single thread by ID */
  getThread(id: string): Promise<Thread | null>;
  /** Create a new thread */
  createThread(title?: string): Promise<Thread>;
  /** Delete a thread and its messages */
  deleteThread(id: string): Promise<void>;
  /** Get all messages for a thread */
  getMessages(threadId: string): Promise<UIMessage[]>;
  /** Save messages for a thread (replaces existing) */
  saveMessages(threadId: string, messages: UIMessage[]): Promise<void>;
}

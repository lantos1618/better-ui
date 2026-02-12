// Shared in-memory task list store.
// Extracted to a server-only module so all API routes share the same instance.

export interface TaskItem {
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  result?: string;
  tool?: string;
  toolInput?: Record<string, unknown>;
}

export interface TaskList {
  listId: string;
  title: string;
  tasks: TaskItem[];
}

// globalThis ensures the store survives HMR in dev mode
const globalKey = '__betterui_taskListStore__';

export const taskListStore: Record<string, TaskList> =
  (globalThis as any)[globalKey] || ((globalThis as any)[globalKey] = {});

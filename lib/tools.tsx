/**
 * Shared Tool Definitions
 */

import { tool } from '@/src/tool';
import { z } from 'zod';
import { QuestionView } from '@/src/components/Question';
import { FormView } from '@/src/components/Form';
import { DataTableView } from '@/src/components/DataTable';
import { ProgressView } from '@/src/components/Progress';
import { MediaDisplayView } from '@/src/components/MediaDisplay';
import { CodeBlockView } from '@/src/components/CodeBlock';
import { FileUploadView } from '@/src/components/FileUpload';

// ============================================
// Weather Tool
// ============================================

export const weatherTool = tool({
  name: 'weather',
  description: 'Get current weather for a city',
  input: z.object({ city: z.string() }),
  output: z.object({
    temp: z.number(),
    city: z.string(),
    condition: z.string(),
  }),
});

weatherTool.server(async ({ city }) => {
  const temp = Math.floor(Math.random() * 30) + 10;
  return {
    temp,
    city,
    condition: temp > 20 ? 'sunny' : 'cloudy'
  };
});

weatherTool.view((data, state) => {
  if (state?.loading) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span>Fetching weather...</span>
        </div>
      </div>
    );
  }
  if (state?.error) {
    return (
      <div className="bg-zinc-800 border border-red-900 rounded-xl p-4 text-red-400 text-sm">
        {state.error.message}
      </div>
    );
  }
  if (!data) return null;

  const icon = data.condition === 'sunny' ? '☀' : '☁';

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-zinc-400 text-xs uppercase tracking-wider">{data.city}</p>
          <p className="text-3xl font-light text-zinc-100 mt-1">{data.temp}°</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-zinc-500 text-sm mt-2 capitalize">{data.condition}</p>
    </div>
  );
});

// ============================================
// Search Tool
// ============================================

export const searchTool = tool({
  name: 'search',
  description: 'Search for information',
  input: z.object({ query: z.string() }),
  output: z.object({
    query: z.string(),
    results: z.array(z.object({
      id: z.number(),
      title: z.string(),
      snippet: z.string(),
      score: z.number(),
    })),
  }),
});

searchTool.server(async ({ query }) => {
  return {
    query,
    results: [
      { id: 1, title: `Result for "${query}" 1`, snippet: `This is a relevant excerpt about ${query} from the first source.`, score: 0.95 },
      { id: 2, title: `Result for "${query}" 2`, snippet: `Another passage discussing ${query} in detail.`, score: 0.87 },
      { id: 3, title: `Result for "${query}" 3`, snippet: `A brief mention of ${query} found in this document.`, score: 0.76 },
    ],
  };
});

searchTool.view((data, state) => {
  if (state?.loading) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span>Searching...</span>
        </div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-700 flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
        <p className="text-zinc-400 text-xs uppercase tracking-wider">Results</p>
        <span className="text-zinc-600 text-xs ml-auto">{data.results.length} found</span>
      </div>
      <div className="divide-y divide-zinc-700/50">
        {data.results.map((r) => (
          <div key={r.id} className="px-4 py-3 hover:bg-zinc-700/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-zinc-200 text-sm">{r.title}</span>
              <span className="text-zinc-500 text-xs font-mono">{(r.score * 100).toFixed(0)}%</span>
            </div>
            <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{r.snippet}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

// ============================================
// Counter Tool
// ============================================

const counterStore: Record<string, number> = {};

export const counterTool = tool({
  name: 'counter',
  description: 'Manage a named counter. Actions: "increment", "decrement", "reset", "get"',
  input: z.object({
    name: z.string().describe('The name of the counter'),
    action: z.enum(['increment', 'decrement', 'reset', 'get']).describe('The action to perform'),
    amount: z.number().optional().describe('Amount to increment/decrement by (default 1)'),
  }),
  output: z.object({
    name: z.string(),
    value: z.number(),
    action: z.string(),
    previousValue: z.number(),
  }),
});

counterTool.server(async ({ name, action, amount = 1 }) => {
  if (!(name in counterStore)) {
    counterStore[name] = 0;
  }

  const previousValue = counterStore[name];

  switch (action) {
    case 'increment':
      counterStore[name] += amount;
      break;
    case 'decrement':
      counterStore[name] -= amount;
      break;
    case 'reset':
      counterStore[name] = 0;
      break;
  }

  return {
    name,
    value: counterStore[name],
    action,
    previousValue,
  };
});

counterTool.view((data, state) => {
  const { onAction } = state || {};
  const isLoading = state?.loading;

  if (state?.error) {
    return (
      <div className="bg-zinc-800 border border-red-900 rounded-xl p-4 text-red-400 text-sm">
        {state.error.message}
      </div>
    );
  }

  // Initial loading (no data yet)
  if (!data) {
    if (isLoading) {
      return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
            <span>Creating counter...</span>
          </div>
        </div>
      );
    }
    return null;
  }

  const changed = data.value !== data.previousValue;
  const diff = data.value - data.previousValue;

  // Has data - show full card, dim if updating
  return (
    <div className={`bg-zinc-800 border border-zinc-700 rounded-xl p-4 transition-opacity ${isLoading ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-zinc-400 text-xs uppercase tracking-wider">{data.name}</p>
        {isLoading ? (
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
        ) : changed ? (
          <span className={`text-xs font-mono ${diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {diff > 0 ? '+' : ''}{diff}
          </span>
        ) : null}
      </div>

      <p className="text-4xl font-light text-zinc-100 tabular-nums">{data.value}</p>

      {onAction && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onAction({ name: data.name, action: 'decrement', amount: 1 })}
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-600 active:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            −1
          </button>
          <button
            onClick={() => onAction({ name: data.name, action: 'increment', amount: 1 })}
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-600 active:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            +1
          </button>
          <button
            onClick={() => onAction({ name: data.name, action: 'increment', amount: 5 })}
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-600 active:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            +5
          </button>
          <button
            onClick={() => onAction({ name: data.name, action: 'reset' })}
            disabled={isLoading}
            className="px-3 py-2 bg-zinc-900 text-zinc-500 text-sm rounded-lg hover:bg-zinc-800 hover:text-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
});

// ============================================
// Artifact Tool
// ============================================

export const artifactTool = tool({
  name: 'artifact',
  description: 'Render rich content like code, markdown, or HTML. Use this when the user asks you to write code, create documents, or generate any rich content.',
  input: z.object({
    type: z.enum(['code', 'markdown', 'html']).describe('The type of content to render'),
    content: z.string().describe('The content to render'),
    title: z.string().optional().describe('Optional title for the artifact'),
    language: z.string().optional().describe('Programming language for code blocks'),
  }),
  output: z.object({
    type: z.enum(['code', 'markdown', 'html']),
    content: z.string(),
    title: z.string().optional(),
    language: z.string().optional(),
  }),
});

artifactTool.server(async (input) => input);

artifactTool.view((data, state) => {
  if (state?.loading) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span>Generating...</span>
        </div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
      {data.title && (
        <div className="px-4 py-2 border-b border-zinc-700">
          <p className="text-zinc-300 text-sm font-medium">{data.title}</p>
        </div>
      )}
      {data.type === 'code' && (
        <pre className="p-4 overflow-x-auto text-sm">
          <code className={`text-zinc-200 ${data.language ? `language-${data.language}` : ''}`}>
            {data.content}
          </code>
        </pre>
      )}
      {data.type === 'markdown' && (
        <div className="p-4 text-zinc-200 text-sm prose-invert max-w-none">
          {data.content}
        </div>
      )}
      {data.type === 'html' && (
        <iframe
          srcDoc={data.content}
          sandbox="allow-scripts"
          className="w-full min-h-[200px] border-0 bg-white"
          title={data.title || 'HTML preview'}
        />
      )}
    </div>
  );
});

// ============================================
// Navigate Tool
// ============================================

export const navigateTool = tool({
  name: 'navigate',
  description: 'Navigate the user to a URL. Use this when the user asks to go to a page or open a link.',
  input: z.object({
    url: z.string().describe('The URL to navigate to'),
    label: z.string().optional().describe('Display label for the link'),
  }),
  output: z.object({
    url: z.string(),
    label: z.string().optional(),
  }),
});

navigateTool.server(async (input) => input);

navigateTool.view((data, state) => {
  if (state?.loading) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span>Navigating...</span>
        </div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <span className="text-lg">&#x2197;</span>
        <div>
          <p className="text-zinc-200 text-sm font-medium">{data.label || data.url}</p>
          <p className="text-zinc-500 text-xs truncate max-w-[300px]">{data.url}</p>
        </div>
      </div>
    </div>
  );
});

// ============================================
// Set Theme Tool
// ============================================

export const setThemeTool = tool({
  name: 'setTheme',
  description: 'Toggle the app theme between light and dark mode. Use this when the user asks to change the theme or switch to dark/light mode.',
  input: z.object({
    theme: z.enum(['light', 'dark']).describe('The theme to set'),
  }),
  output: z.object({
    theme: z.enum(['light', 'dark']),
  }),
});

setThemeTool.server(async (input) => input);

setThemeTool.view((data, state) => {
  if (state?.loading) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span>Switching theme...</span>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const icon = data.theme === 'dark' ? '\u{1F319}' : '\u{2600}\u{FE0F}';

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <p className="text-zinc-200 text-sm">Theme set to <span className="font-medium">{data.theme}</span></p>
      </div>
    </div>
  );
});

// ============================================
// Stock Quote Tool
// ============================================

export const stockQuoteTool = tool({
  name: 'stockQuote',
  description: 'Get a live stock quote (price, change, high, low, volume) for a given ticker symbol. Use this when the user asks about a stock price, share price, or market data.',
  input: z.object({
    symbol: z.string().describe('The stock ticker symbol, e.g. TSLA, AAPL, MSFT'),
  }),
  output: z.object({
    symbol: z.string(),
    name: z.string(),
    price: z.number(),
    previousClose: z.number(),
    change: z.number(),
    changePercent: z.number(),
    dayHigh: z.number(),
    dayLow: z.number(),
    volume: z.number(),
    currency: z.string(),
  }),
});

stockQuoteTool.server(async ({ symbol }) => {
  const ticker = symbol.toUpperCase().trim();
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch quote for ${ticker}`);
  }

  const json = await res.json();
  const meta = json.chart?.result?.[0]?.meta;

  if (!meta) {
    throw new Error(`No data found for symbol "${ticker}"`);
  }

  const indicators = json.chart.result[0].indicators?.quote?.[0] || {};
  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
  const price = meta.regularMarketPrice ?? 0;
  const change = +(price - previousClose).toFixed(2);
  const changePercent = previousClose ? +((change / previousClose) * 100).toFixed(2) : 0;

  return {
    symbol: meta.symbol || ticker,
    name: meta.shortName || meta.longName || ticker,
    price,
    previousClose,
    change,
    changePercent,
    dayHigh: indicators.high ? Math.max(...indicators.high.filter(Boolean)) : price,
    dayLow: indicators.low ? Math.min(...indicators.low.filter(Boolean)) : price,
    volume: meta.regularMarketVolume ?? 0,
    currency: meta.currency || 'USD',
  };
});

stockQuoteTool.view((data, state) => {
  if (state?.loading) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span>Fetching quote...</span>
        </div>
      </div>
    );
  }
  if (state?.error) {
    return (
      <div className="bg-zinc-800 border border-red-900 rounded-xl p-4 text-red-400 text-sm">
        {state.error.message}
      </div>
    );
  }
  if (!data) return null;

  const isPositive = data.change >= 0;

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-zinc-400 text-xs uppercase tracking-wider">{data.symbol}</p>
          <p className="text-3xl font-light text-zinc-100 mt-1">
            {data.currency === 'USD' ? '$' : ''}{data.price.toFixed(2)}
          </p>
        </div>
        <div className={`text-right ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          <p className="text-sm font-mono">
            {isPositive ? '+' : ''}{data.change.toFixed(2)}
          </p>
          <p className="text-xs font-mono">
            {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-zinc-700/50">
        <div>
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider">High</p>
          <p className="text-zinc-300 text-sm font-mono">{data.dayHigh.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Low</p>
          <p className="text-zinc-300 text-sm font-mono">{data.dayLow.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Volume</p>
          <p className="text-zinc-300 text-sm font-mono">
            {data.volume >= 1_000_000
              ? (data.volume / 1_000_000).toFixed(1) + 'M'
              : data.volume >= 1_000
                ? (data.volume / 1_000).toFixed(1) + 'K'
                : data.volume.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
});

// ============================================
// Send Email Tool (HITL — requires confirmation)
// ============================================

export const sendEmailTool = tool({
  name: 'sendEmail',
  description: 'Send an email to a recipient. Call this tool directly — the user will be prompted to approve or reject before it executes.',
  input: z.object({
    to: z.string().describe('Recipient email address'),
    subject: z.string().describe('Email subject line'),
    body: z.string().describe('Email body text'),
  }),
  output: z.object({
    to: z.string(),
    subject: z.string(),
    body: z.string(),
    status: z.string(),
  }),
  confirm: true,
});

sendEmailTool.server(async ({ to, subject, body }) => {
  // Mock email sending
  return { to, subject, body, status: 'sent' };
});

sendEmailTool.view((data, state) => {
  if (state?.loading) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span>Sending email...</span>
        </div>
      </div>
    );
  }
  if (state?.error) {
    return (
      <div className="bg-zinc-800 border border-red-900 rounded-xl p-4 text-red-400 text-sm">
        {state.error.message}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-zinc-200 text-sm font-medium">{data.subject}</p>
          <p className="text-zinc-500 text-xs mt-1">To: {data.to}</p>
        </div>
        <span className="text-xs font-medium text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded shrink-0 ml-3">
          {data.status}
        </span>
      </div>
      <p className="text-zinc-400 text-sm mt-3 whitespace-pre-wrap">{data.body}</p>
    </div>
  );
});

// ============================================
// Task List Tool
// ============================================

interface TaskItem {
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  result?: string;
  tool?: string;
  toolInput?: Record<string, unknown>;
}

interface TaskList {
  listId: string;
  title: string;
  tasks: TaskItem[];
}

const taskListStore: Record<string, TaskList> = {};

export const taskListTool = tool({
  name: 'taskList',
  description: 'Create and manage a task list for multi-step plans. Create a list first, then update each task as you work through them. Actions: "create" (new list), "update" (change task status), "complete" (mark done), "fail" (mark failed), "get" (read current state).',
  groupKey: (input) => input.listId || 'default',
  confirm: (input) => input.action === 'create',
  input: z.object({
    action: z.enum(['create', 'update', 'complete', 'fail', 'get']),
    listId: z.string().optional(),
    title: z.string().optional(),
    tasks: z.array(z.object({
      label: z.string(),
      tool: z.string().optional(),
      toolInput: z.record(z.unknown()).optional(),
    })).optional(),
    taskIndex: z.number().optional(),
    status: z.enum(['pending', 'running', 'done', 'failed']).optional(),
    result: z.string().optional(),
  }),
  output: z.object({
    listId: z.string(),
    title: z.string(),
    tasks: z.array(z.object({
      label: z.string(),
      status: z.enum(['pending', 'running', 'done', 'failed']),
      result: z.string().optional(),
      tool: z.string().optional(),
      toolInput: z.record(z.unknown()).optional(),
    })),
    progress: z.object({ total: z.number(), done: z.number() }),
  }),
});

taskListTool.server(async ({ action, listId, title, tasks, taskIndex, status, result }) => {
  if (action === 'create') {
    const id = listId || `tl_${Date.now().toString(36)}`;
    const items: TaskItem[] = (tasks || []).map((t) => ({
      label: t.label,
      status: 'pending' as const,
      tool: t.tool,
      toolInput: t.toolInput,
    }));
    taskListStore[id] = { listId: id, title: title || 'Tasks', tasks: items };
    const list = taskListStore[id];
    return {
      ...list,
      progress: { total: list.tasks.length, done: list.tasks.filter((t) => t.status === 'done').length },
    };
  }

  const id = listId || Object.keys(taskListStore)[0];
  if (!id || !taskListStore[id]) {
    throw new Error(`Task list "${id}" not found`);
  }
  const list = taskListStore[id];

  if (action === 'get') {
    return {
      ...list,
      progress: { total: list.tasks.length, done: list.tasks.filter((t) => t.status === 'done').length },
    };
  }

  if (taskIndex == null || taskIndex < 0 || taskIndex >= list.tasks.length) {
    throw new Error(`Invalid taskIndex: ${taskIndex}`);
  }

  if (action === 'update') {
    if (status) list.tasks[taskIndex].status = status;
    if (result) list.tasks[taskIndex].result = result;
  } else if (action === 'complete') {
    list.tasks[taskIndex].status = 'done';
    if (result) list.tasks[taskIndex].result = result;
  } else if (action === 'fail') {
    list.tasks[taskIndex].status = 'failed';
    if (result) list.tasks[taskIndex].result = result;
  }

  return {
    ...list,
    progress: { total: list.tasks.length, done: list.tasks.filter((t) => t.status === 'done').length },
  };
});

taskListTool.view((data, state) => {
  if (state?.loading && !data) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span>Setting up tasks...</span>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const { title, tasks, progress } = data;
  const pct = progress.total > 0 ? (progress.done / progress.total) * 100 : 0;

  return (
    <div className={`bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden transition-opacity ${state?.loading ? 'opacity-70' : ''}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center justify-between">
          <p className="text-zinc-300 text-sm font-medium">{title}</p>
          <span className="text-zinc-500 text-xs font-mono">{progress.done}/{progress.total}</span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {/* Task items */}
      <div className="divide-y divide-zinc-700/50">
        {tasks.map((task, i) => (
          <div key={i} className="px-4 py-2.5 flex items-start gap-3">
            {/* Status indicator */}
            <div className="mt-0.5 shrink-0">
              {task.status === 'pending' && (
                <div className="w-4 h-4 rounded-full border border-zinc-600" />
              )}
              {task.status === 'running' && (
                <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                </div>
              )}
              {task.status === 'done' && (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {task.status === 'failed' && (
                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            {/* Label & result */}
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${
                task.status === 'done' ? 'text-zinc-400 line-through' :
                task.status === 'failed' ? 'text-red-400' :
                task.status === 'running' ? 'text-zinc-100' :
                'text-zinc-400'
              }`}>
                {task.label}
              </p>
              {task.result && (
                <p className={`text-xs mt-0.5 ${task.status === 'failed' ? 'text-red-500' : 'text-zinc-500'}`}>
                  {task.result}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ============================================
// Question Tool — AI asks user to pick from options
// ============================================

export const questionTool = tool({
  name: 'question',
  description: 'Ask the user a question with predefined options. Supports single-select (user picks one) and multi-select (user picks multiple then confirms). Set mode to "multi" when the user might want to choose more than one option. Do NOT write any extra text — the question UI speaks for itself.',
  autoRespond: true,
  input: z.object({
    question: z.string().describe('The question to ask'),
    options: z.array(z.object({
      label: z.string(),
      value: z.string(),
      description: z.string().optional(),
    })).describe('Available options'),
    mode: z.enum(['single', 'multi']).optional().describe('Selection mode (default: single)'),
    allowFreeform: z.boolean().optional().describe('Allow freeform text input'),
    // User selection (set by UI action, not by AI)
    selected: z.union([z.string(), z.array(z.string())]).optional().describe('Do not set this — it is filled by the user through the UI'),
  }),
  output: z.object({
    question: z.string(),
    options: z.array(z.object({
      label: z.string(),
      value: z.string(),
      description: z.string().optional(),
    })),
    mode: z.string().optional(),
    allowFreeform: z.boolean().optional(),
    selected: z.union([z.string(), z.array(z.string())]).nullable(),
  }),
});

questionTool.server(async (input) => ({
  ...input,
  mode: input.mode || 'single',
  allowFreeform: input.allowFreeform || false,
  selected: input.selected ?? null,
}));

questionTool.view((data, state) => {
  if (state?.loading && !data) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span>Loading question...</span>
        </div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <QuestionView
      question={data.question}
      options={data.options}
      mode={(data.mode as 'single' | 'multi') || 'single'}
      selected={data.selected}
      allowFreeform={data.allowFreeform}
      onSelect={(value) => {
        state?.onAction?.({
          question: data.question,
          options: data.options,
          mode: data.mode,
          allowFreeform: data.allowFreeform,
          selected: value,
        } as any);
      }}
      loading={state?.loading}
    />
  );
});

// ============================================
// Form Tool — AI collects structured data from user
// ============================================

export const formTool = tool({
  name: 'form',
  description: 'Present a form to collect structured data from the user. Use when you need multiple fields of information. Do NOT write any extra text — the form UI speaks for itself.',
  autoRespond: true,
  input: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    fields: z.array(z.object({
      name: z.string(),
      label: z.string(),
      type: z.enum(['text', 'number', 'email', 'url', 'textarea', 'select', 'toggle']).optional(),
      required: z.boolean().optional(),
      placeholder: z.string().optional(),
      options: z.array(z.string()).optional(),
      defaultValue: z.string().optional(),
      hint: z.string().optional(),
    })),
    submitLabel: z.string().optional(),
    // User submission (set by UI action, not by AI)
    submitted: z.boolean().optional().describe('Do not set — filled by the user through the UI'),
    values: z.record(z.string()).optional().describe('Do not set — filled by the user through the UI'),
  }),
  output: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    fields: z.array(z.object({
      name: z.string(),
      label: z.string(),
      type: z.enum(['text', 'number', 'email', 'url', 'textarea', 'select', 'toggle']).optional(),
      required: z.boolean().optional(),
      placeholder: z.string().optional(),
      options: z.array(z.string()).optional(),
      defaultValue: z.string().optional(),
      hint: z.string().optional(),
    })),
    submitLabel: z.string().optional(),
    submitted: z.boolean(),
    values: z.record(z.string()).nullable(),
  }),
});

formTool.server(async (input) => ({
  ...input,
  submitted: input.submitted ?? false,
  values: input.values ?? null,
}));

formTool.view((data, state) => {
  if (state?.loading && !data) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span>Loading form...</span>
        </div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <FormView
      title={data.title}
      description={data.description}
      fields={data.fields}
      values={data.values || undefined}
      submitted={data.submitted}
      submitLabel={data.submitLabel}
      onSubmit={(values) => {
        state?.onAction?.({
          title: data.title,
          description: data.description,
          fields: data.fields,
          submitLabel: data.submitLabel,
          submitted: true,
          values,
        } as any);
      }}
      loading={state?.loading}
    />
  );
});

// ============================================
// Data Table Tool — AI displays structured tabular data
// ============================================

export const dataTableTool = tool({
  name: 'dataTable',
  description: 'Display data in a sortable, paginated table. Use for lists, records, comparisons, or any structured data.',
  input: z.object({
    title: z.string().optional(),
    columns: z.array(z.object({
      key: z.string(),
      label: z.string(),
      sortable: z.boolean().optional(),
      align: z.enum(['left', 'right', 'center']).optional(),
    })),
    rows: z.array(z.record(z.unknown())),
    caption: z.string().optional(),
    pageSize: z.number().optional(),
  }),
  output: z.object({
    title: z.string().optional(),
    columns: z.array(z.object({
      key: z.string(),
      label: z.string(),
      sortable: z.boolean().optional(),
      align: z.enum(['left', 'right', 'center']).optional(),
    })),
    rows: z.array(z.record(z.unknown())),
    caption: z.string().optional(),
    pageSize: z.number().optional(),
  }),
});

dataTableTool.server(async (input) => input);

dataTableTool.view((data, state) => {
  if (state?.loading && !data) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span>Loading table...</span>
        </div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <DataTableView
      title={data.title}
      columns={data.columns}
      rows={data.rows}
      caption={data.caption}
      pageSize={data.pageSize}
      loading={state?.loading}
    />
  );
});

// ============================================
// Progress Tool — AI shows step-based or bar progress
// ============================================

export const progressTool = tool({
  name: 'progress',
  description: 'Show a progress indicator — either steps with labels or a percentage bar. Use for long-running operations.',
  input: z.object({
    title: z.string().optional(),
    steps: z.array(z.object({
      label: z.string(),
      status: z.enum(['pending', 'active', 'done', 'error']),
      detail: z.string().optional(),
    })).optional(),
    percent: z.number().optional(),
    label: z.string().optional(),
  }),
  output: z.object({
    title: z.string().optional(),
    steps: z.array(z.object({
      label: z.string(),
      status: z.enum(['pending', 'active', 'done', 'error']),
      detail: z.string().optional(),
    })).optional(),
    percent: z.number().optional(),
    label: z.string().optional(),
  }),
});

progressTool.server(async (input) => input);

progressTool.view((data, state) => {
  if (state?.loading && !data) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <ProgressView
      title={data.title}
      steps={data.steps}
      percent={data.percent}
      label={data.label}
      loading={state?.loading}
    />
  );
});

// ============================================
// Media Tool — AI displays images, video, audio
// ============================================

export const mediaTool = tool({
  name: 'media',
  description: 'Display images, videos, or audio. Use for generated images, fetched media, or file previews.',
  input: z.object({
    title: z.string().optional(),
    items: z.array(z.object({
      url: z.string(),
      type: z.enum(['image', 'video', 'audio']),
      alt: z.string().optional(),
      caption: z.string().optional(),
    })),
    layout: z.enum(['grid', 'stack']).optional(),
  }),
  output: z.object({
    title: z.string().optional(),
    items: z.array(z.object({
      url: z.string(),
      type: z.enum(['image', 'video', 'audio']),
      alt: z.string().optional(),
      caption: z.string().optional(),
    })),
    layout: z.string().optional(),
  }),
});

mediaTool.server(async (input) => ({
  ...input,
  layout: input.layout || 'grid',
}));

mediaTool.view((data, state) => {
  if (state?.loading && !data) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span>Loading media...</span>
        </div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <MediaDisplayView
      title={data.title}
      items={data.items}
      layout={(data.layout as 'grid' | 'stack') || 'grid'}
      loading={state?.loading}
    />
  );
});

// ============================================
// Code Tool — AI displays code with copy/diff
// ============================================

export const codeTool = tool({
  name: 'code',
  description: 'Display code with syntax highlighting, copy button, and optional diff view. Better than inline code for substantial code blocks.',
  input: z.object({
    code: z.string(),
    language: z.string().optional(),
    title: z.string().optional(),
    showLineNumbers: z.boolean().optional(),
    diff: z.object({
      before: z.string(),
      after: z.string(),
    }).optional(),
  }),
  output: z.object({
    code: z.string(),
    language: z.string().optional(),
    title: z.string().optional(),
    showLineNumbers: z.boolean().optional(),
    diff: z.object({
      before: z.string(),
      after: z.string(),
    }).optional(),
  }),
});

codeTool.server(async (input) => input);

codeTool.view((data, state) => {
  if (state?.loading && !data) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span>Generating code...</span>
        </div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <CodeBlockView
      code={data.code}
      language={data.language}
      title={data.title}
      showLineNumbers={data.showLineNumbers}
      diff={data.diff}
      loading={state?.loading}
    />
  );
});

// ============================================
// File Upload Tool — AI requests files from user
// ============================================

export const fileUploadTool = tool({
  name: 'fileUpload',
  description: 'Request file upload from the user. Use when you need the user to provide a file for processing. Do NOT write extra text — the upload UI speaks for itself.',
  input: z.object({
    title: z.string().optional(),
    accept: z.string().optional().describe('Accepted file types (e.g. "image/*,.pdf")'),
    maxSize: z.number().optional().describe('Max file size in bytes'),
    multiple: z.boolean().optional(),
    // User upload result (set by UI action, not by AI)
    files: z.array(z.object({
      name: z.string(),
      size: z.number(),
      type: z.string(),
      url: z.string().optional(),
    })).optional().describe('Do not set — filled by the user through the UI'),
  }),
  output: z.object({
    title: z.string().optional(),
    accept: z.string().optional(),
    maxSize: z.number().optional(),
    multiple: z.boolean().optional(),
    files: z.array(z.object({
      name: z.string(),
      size: z.number(),
      type: z.string(),
      url: z.string().optional(),
    })),
  }),
});

fileUploadTool.server(async (input) => ({
  ...input,
  files: input.files ?? [],
}));

fileUploadTool.view((data, state) => {
  if (state?.loading && !data) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span>Preparing upload...</span>
        </div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <FileUploadView
      title={data.title}
      accept={data.accept}
      maxSize={data.maxSize}
      multiple={data.multiple}
      files={data.files}
      onUpload={(files) => {
        const fileData = files.map(f => ({ name: f.name, size: f.size, type: f.type }));
        state?.onAction?.({
          title: data.title,
          accept: data.accept,
          maxSize: data.maxSize,
          multiple: data.multiple,
          files: fileData,
        } as any);
      }}
      loading={state?.loading}
    />
  );
});

// ============================================
// Export
// ============================================

export const tools = {
  weather: weatherTool,
  search: searchTool,
  counter: counterTool,
  artifact: artifactTool,
  navigate: navigateTool,
  setTheme: setThemeTool,
  stockQuote: stockQuoteTool,
  sendEmail: sendEmailTool,
  taskList: taskListTool,
  question: questionTool,
  form: formTool,
  dataTable: dataTableTool,
  progress: progressTool,
  media: mediaTool,
  code: codeTool,
  fileUpload: fileUploadTool,
};

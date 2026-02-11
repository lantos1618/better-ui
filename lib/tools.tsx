/**
 * Shared Tool Definitions
 */

import { tool } from '@/src/tool';
import { z } from 'zod';

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
    results: z.array(z.object({
      id: z.number(),
      title: z.string(),
      score: z.number(),
    })),
  }),
});

searchTool.server(async ({ query }) => {
  return {
    results: [
      { id: 1, title: `Result for "${query}" 1`, score: 0.95 },
      { id: 2, title: `Result for "${query}" 2`, score: 0.87 },
      { id: 3, title: `Result for "${query}" 3`, score: 0.76 },
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
      <div className="px-4 py-3 border-b border-zinc-700">
        <p className="text-zinc-400 text-xs uppercase tracking-wider">Results</p>
      </div>
      <div className="divide-y divide-zinc-700/50">
        {data.results.map((r) => (
          <div key={r.id} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-700/30 transition-colors">
            <span className="text-zinc-200 text-sm">{r.title}</span>
            <span className="text-zinc-500 text-xs font-mono">{(r.score * 100).toFixed(0)}%</span>
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
// Export
// ============================================

export const tools = {
  weather: weatherTool,
  search: searchTool,
  counter: counterTool,
  artifact: artifactTool,
  navigate: navigateTool,
  setTheme: setThemeTool,
};

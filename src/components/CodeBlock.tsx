'use client';

import React, { useState } from 'react';

// ============================================
// Types
// ============================================

export interface CodeBlockViewProps {
  /** The code content */
  code: string;
  /** Programming language for display label */
  language?: string;
  /** Title above the code block */
  title?: string;
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Diff mode: show before/after */
  diff?: { before: string; after: string };
  /** Loading state */
  loading?: boolean;
}

// ============================================
// Component
// ============================================

export function CodeBlockView({
  code,
  language,
  title,
  showLineNumbers = false,
  diff,
  loading = false,
}: CodeBlockViewProps) {
  const [copied, setCopied] = useState(false);
  const [diffView, setDiffView] = useState<'before' | 'after' | 'diff'>('diff');

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span>Generating code...</span>
        </div>
      </div>
    );
  }

  // Diff mode
  if (diff) {
    const beforeLines = diff.before.split('\n');
    const afterLines = diff.after.split('\n');

    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {title && <span className="text-zinc-300 text-sm font-medium">{title}</span>}
            {language && <span className="text-zinc-600 text-xs font-mono">{language}</span>}
          </div>
          <div className="flex items-center gap-1">
            {(['before', 'diff', 'after'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setDiffView(mode)}
                className={`px-2 py-0.5 text-xs rounded ${
                  diffView === mode
                    ? 'bg-zinc-700 text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
          {diffView === 'before' && (
            <code className="text-zinc-300">{diff.before}</code>
          )}
          {diffView === 'after' && (
            <code className="text-zinc-300">{diff.after}</code>
          )}
          {diffView === 'diff' && (
            <code>
              {renderSimpleDiff(beforeLines, afterLines)}
            </code>
          )}
        </pre>
      </div>
    );
  }

  // Normal code block
  const lines = code.split('\n');

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {title && <span className="text-zinc-300 text-sm font-medium">{title}</span>}
          {language && <span className="text-zinc-600 text-xs font-mono">{language}</span>}
          {!title && !language && <span className="text-zinc-600 text-xs">Code</span>}
        </div>
        <button
          onClick={() => handleCopy(code)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors rounded hover:bg-zinc-700/50"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
        <code className="text-zinc-300">
          {showLineNumbers
            ? lines.map((line, i) => (
                <div key={i} className="flex">
                  <span className="text-zinc-600 select-none w-8 shrink-0 text-right mr-4 font-mono text-xs leading-relaxed">
                    {i + 1}
                  </span>
                  <span>{line}</span>
                </div>
              ))
            : code
          }
        </code>
      </pre>
    </div>
  );
}

// ============================================
// Simple diff rendering
// ============================================

function renderSimpleDiff(beforeLines: string[], afterLines: string[]) {
  const result: React.ReactNode[] = [];
  const beforeSet = new Set(beforeLines);
  const afterSet = new Set(afterLines);

  // Removed lines (in before but not after)
  for (const line of beforeLines) {
    if (!afterSet.has(line)) {
      result.push(
        <div key={`-${result.length}`} className="bg-red-900/20 text-red-300">
          <span className="text-red-500 select-none mr-2">-</span>{line}
        </div>
      );
    }
  }

  // Added lines (in after but not before)
  for (const line of afterLines) {
    if (!beforeSet.has(line)) {
      result.push(
        <div key={`+${result.length}`} className="bg-emerald-900/20 text-emerald-300">
          <span className="text-emerald-500 select-none mr-2">+</span>{line}
        </div>
      );
    }
  }

  // Unchanged lines
  for (const line of afterLines) {
    if (beforeSet.has(line)) {
      result.push(
        <div key={`=${result.length}`} className="text-zinc-500">
          <span className="select-none mr-2">&nbsp;</span>{line}
        </div>
      );
    }
  }

  return result;
}

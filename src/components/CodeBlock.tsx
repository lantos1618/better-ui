'use client';

import React, { useState, useEffect } from 'react';
import { Check, Copy } from 'lucide-react';

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
  /** Additional CSS class for the root element */
  className?: string;
}

export function CodeBlockView({
  code,
  language,
  title,
  showLineNumbers = false,
  diff,
  loading = false,
  className,
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
      <div className={`bg-[var(--bui-bg-elevated,#27272a)] border border-[var(--bui-border-strong,#3f3f46)] rounded-xl p-4 ${className || ''}`}>
        <div className="flex items-center gap-2 text-[var(--bui-fg-secondary,#a1a1aa)] text-sm">
          <div className="w-1.5 h-1.5 bg-[var(--bui-fg-muted,#71717a)] rounded-full animate-pulse" />
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
      <div className={`bg-[var(--bui-bg-elevated,#27272a)] border border-[var(--bui-border-strong,#3f3f46)] rounded-xl overflow-hidden ${className || ''}`}>
        <div className="px-4 py-2.5 border-b border-[var(--bui-border-strong,#3f3f46)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {title && <span className="text-[var(--bui-fg-secondary,#a1a1aa)] text-sm font-medium">{title}</span>}
            {language && <span className="text-[var(--bui-fg-faint,#52525b)] text-xs font-mono">{language}</span>}
          </div>
          <div className="flex items-center gap-1">
            {(['before', 'diff', 'after'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setDiffView(mode)}
                className={`px-2 py-0.5 text-xs rounded ${
                  diffView === mode
                    ? 'bg-[var(--bui-bg-hover,#3f3f46)] text-[var(--bui-fg,#f4f4f5)]'
                    : 'text-[var(--bui-fg-muted,#71717a)] hover:text-[var(--bui-fg-secondary,#a1a1aa)]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
          {diffView === 'before' && (
            <code className="text-[var(--bui-fg-secondary,#a1a1aa)]">{diff.before}</code>
          )}
          {diffView === 'after' && (
            <code className="text-[var(--bui-fg-secondary,#a1a1aa)]">{diff.after}</code>
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
    <div className={`bg-[var(--bui-bg-elevated,#27272a)] border border-[var(--bui-border-strong,#3f3f46)] rounded-xl overflow-hidden ${className || ''}`}>
      <div className="px-4 py-2.5 border-b border-[var(--bui-border-strong,#3f3f46)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {title && <span className="text-[var(--bui-fg-secondary,#a1a1aa)] text-sm font-medium">{title}</span>}
          {language && <span className="text-[var(--bui-fg-faint,#52525b)] text-xs font-mono">{language}</span>}
          {!title && !language && <span className="text-[var(--bui-fg-faint,#52525b)] text-xs">Code</span>}
        </div>
        <button
          onClick={() => handleCopy(code)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-[var(--bui-fg-muted,#71717a)] hover:text-[var(--bui-fg-secondary,#a1a1aa)] transition-colors rounded hover:bg-[var(--bui-bg-hover,#3f3f46)]/50"
        >
          {copied ? (
            <>
              <Check size={14} className="text-[var(--bui-success-fg,#6ee7b7)]" />
              Copied
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy
            </>
          )}
        </button>
      </div>
      <CodeContent code={code} language={language} lines={lines} showLineNumbers={showLineNumbers} />
    </div>
  );
}

/**
 * Renders the code body with lazy syntax highlighting via `shiki`.
 *
 * Highlighting is loaded on demand (dynamic import) to keep it out of the
 * initial bundle. While it loads, on error, or for an unknown language, we fall
 * back to plain text. Line numbers are rendered with the plain-text path so
 * they remain aligned; highlighted output is only used when line numbers are
 * off. The single `dangerouslySetInnerHTML` consumes shiki's own escaped HTML.
 */
function CodeContent({
  code,
  language,
  lines,
  showLineNumbers,
}: {
  code: string;
  language?: string;
  lines: string[];
  showLineNumbers: boolean;
}) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Highlighting requires a language hint; skip if none provided.
    if (!language) {
      setHtml(null);
      return;
    }
    // Streaming caveat: this re-runs the dynamic import + codeToHtml on every
    // `code` change. `import('shiki')` is served from the module cache after the
    // first load, so only re-highlighting (not re-loading) repeats. There is no
    // streaming consumer today; if one is added, gate this on a streaming/loading
    // prop (e.g. only highlight once the final chunk lands) to avoid highlighting
    // every intermediate token — the plain-text fallback below already renders
    // partial code fine while a stream is in flight.
    setHtml(null);
    import('shiki')
      .then(({ codeToHtml }) =>
        codeToHtml(code, { lang: language, theme: 'github-dark' })
      )
      .then((out) => {
        if (!cancelled) setHtml(out);
      })
      .catch(() => {
        // Unknown language / load failure => keep plain-text fallback.
        if (!cancelled) setHtml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  // Use highlighted output only when we don't need per-line numbering, since
  // shiki emits a single block that we can't easily interleave with numbers.
  if (html && !showLineNumbers) {
    return (
      <div
        className="bui-shiki p-4 overflow-x-auto text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
      <code className="text-[var(--bui-fg-secondary,#a1a1aa)]">
        {showLineNumbers
          ? lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="text-[var(--bui-fg-faint,#52525b)] select-none w-8 shrink-0 text-right mr-4 font-mono text-xs leading-relaxed">
                  {i + 1}
                </span>
                <span>{line}</span>
              </div>
            ))
          : code}
      </code>
    </pre>
  );
}

function renderSimpleDiff(beforeLines: string[], afterLines: string[]) {
  const result: React.ReactNode[] = [];
  const beforeSet = new Set(beforeLines);
  const afterSet = new Set(afterLines);

  // Removed lines (in before but not after)
  for (const line of beforeLines) {
    if (!afterSet.has(line)) {
      result.push(
        <div key={`-${result.length}`} className="bg-[var(--bui-error-muted,rgba(220,38,38,0.08))] text-[var(--bui-error-fg,#f87171)]">
          <span className="text-[var(--bui-error-fg,#f87171)] select-none mr-2">-</span>{line}
        </div>
      );
    }
  }

  // Added lines (in after but not before)
  for (const line of afterLines) {
    if (!beforeSet.has(line)) {
      result.push(
        <div key={`+${result.length}`} className="bg-[var(--bui-success-muted,rgba(16,185,129,0.12))] text-[var(--bui-success-fg,#6ee7b7)]">
          <span className="text-[var(--bui-success,#059669)] select-none mr-2">+</span>{line}
        </div>
      );
    }
  }

  // Unchanged lines
  for (const line of afterLines) {
    if (beforeSet.has(line)) {
      result.push(
        <div key={`=${result.length}`} className="text-[var(--bui-fg-muted,#71717a)]">
          <span className="select-none mr-2">&nbsp;</span>{line}
        </div>
      );
    }
  }

  return result;
}

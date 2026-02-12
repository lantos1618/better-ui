'use client';

import React, { useState } from 'react';

export interface QuestionOption {
  label: string;
  value: string;
  description?: string;
}

export interface QuestionViewProps {
  /** The question text */
  question: string;
  /** Available options */
  options: QuestionOption[];
  /** Selection mode */
  mode?: 'single' | 'multi';
  /** Currently selected value(s) */
  selected?: string | string[] | null;
  /** Called when user selects an option */
  onSelect?: (value: string | string[]) => void;
  /** Allow freeform text input as an alternative to options */
  allowFreeform?: boolean;
  /** Loading state (e.g. after selection is submitted) */
  loading?: boolean;
  /** Additional CSS class for the root element */
  className?: string;
}

export function QuestionView({
  question,
  options,
  mode = 'single',
  selected,
  onSelect,
  allowFreeform = false,
  loading = false,
  className,
}: QuestionViewProps) {
  const [multiSelected, setMultiSelected] = useState<Set<string>>(
    () => new Set(Array.isArray(selected) ? selected : [])
  );
  const [freeformValue, setFreeformValue] = useState('');
  const [showFreeform, setShowFreeform] = useState(false);

  const isSelected = (value: string) => {
    if (mode === 'multi') return multiSelected.has(value);
    return selected === value;
  };

  const handleSingleSelect = (value: string) => {
    if (loading) return;
    onSelect?.(value);
  };

  const handleMultiToggle = (value: string) => {
    if (loading) return;
    setMultiSelected(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const handleMultiSubmit = () => {
    if (loading || multiSelected.size === 0) return;
    onSelect?.(Array.from(multiSelected));
  };

  const handleFreeformSubmit = () => {
    if (loading || !freeformValue.trim()) return;
    onSelect?.(freeformValue.trim());
  };

  // Already answered
  if (selected && !loading) {
    const display = Array.isArray(selected)
      ? selected.map(v => options.find(o => o.value === v)?.label || v).join(', ')
      : options.find(o => o.value === selected)?.label || selected;

    return (
      <div className={`bg-[var(--bui-bg-elevated,#27272a)] border border-[var(--bui-border-strong,#3f3f46)] rounded-xl p-4 ${className || ''}`}>
        <p className="text-[var(--bui-fg-secondary,#a1a1aa)] text-xs uppercase tracking-wider mb-2">Answered</p>
        <p className="text-[var(--bui-fg-secondary,#a1a1aa)] text-sm">{question}</p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bui-success-muted,rgba(16,185,129,0.12))] border border-[var(--bui-success-border,rgba(4,120,87,0.3))] rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--bui-success-fg,#6ee7b7)]" />
          <span className="text-[var(--bui-success-fg,#6ee7b7)] text-sm">{display}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[var(--bui-bg-elevated,#27272a)] border border-[var(--bui-border-strong,#3f3f46)] rounded-xl p-4 transition-opacity ${loading ? 'opacity-60' : ''} ${className || ''}`}>
      <p className="text-[var(--bui-fg,#f4f4f5)] text-sm font-medium mb-3">{question}</p>

      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => mode === 'single' ? handleSingleSelect(opt.value) : handleMultiToggle(opt.value)}
            disabled={loading}
            className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
              isSelected(opt.value)
                ? 'border-[var(--bui-primary-border,#2563eb80)] bg-[var(--bui-primary-muted,#1e3a5f)] text-[var(--bui-fg,#f4f4f5)]'
                : 'border-[var(--bui-border-strong,#3f3f46)] bg-[var(--bui-bg-surface,#18181b)]/50 text-[var(--bui-fg-secondary,#a1a1aa)] hover:border-[var(--bui-border-strong,#3f3f46)] hover:bg-[var(--bui-bg-surface,#18181b)]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center gap-3">
              {/* Checkbox/radio indicator */}
              <div className={`shrink-0 w-4 h-4 rounded-${mode === 'multi' ? 'sm' : 'full'} border ${
                isSelected(opt.value)
                  ? 'border-[var(--bui-primary,#2563eb)] bg-[var(--bui-primary-hover,#3b82f6)]'
                  : 'border-[var(--bui-border-strong,#3f3f46)]'
              } flex items-center justify-center`}>
                {isSelected(opt.value) && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm">{opt.label}</span>
                {opt.description && (
                  <p className="text-[var(--bui-fg-muted,#71717a)] text-xs mt-0.5">{opt.description}</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Multi-select submit */}
      {mode === 'multi' && (
        <button
          onClick={handleMultiSubmit}
          disabled={loading || multiSelected.size === 0}
          className="mt-3 px-4 py-2 bg-[var(--bui-primary,#2563eb)] text-white text-sm rounded-lg hover:bg-[var(--bui-primary-hover,#3b82f6)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Confirm ({multiSelected.size} selected)
        </button>
      )}

      {/* Freeform input */}
      {allowFreeform && (
        <div className="mt-3 pt-3 border-t border-[var(--bui-border-strong,#3f3f46)]">
          {!showFreeform ? (
            <button
              onClick={() => setShowFreeform(true)}
              className="text-[var(--bui-fg-muted,#71717a)] text-xs hover:text-[var(--bui-fg-secondary,#a1a1aa)] transition-colors"
            >
              Or type your own answer...
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={freeformValue}
                onChange={(e) => setFreeformValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFreeformSubmit()}
                placeholder="Type your answer..."
                className="flex-1 bg-[var(--bui-bg-surface,#18181b)] border border-[var(--bui-border-strong,#3f3f46)] rounded-lg px-3 py-2 text-sm text-[var(--bui-fg,#f4f4f5)] placeholder-[var(--bui-fg-faint,#52525b)] focus:outline-none focus:border-[var(--bui-border-strong,#3f3f46)]"
              />
              <button
                onClick={handleFreeformSubmit}
                disabled={loading || !freeformValue.trim()}
                className="px-3 py-2 bg-[var(--bui-primary,#2563eb)] text-white text-sm rounded-lg hover:bg-[var(--bui-primary-hover,#3b82f6)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

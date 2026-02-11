'use client';

import React, { useState } from 'react';

// ============================================
// Types
// ============================================

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
}

// ============================================
// Component
// ============================================

export function QuestionView({
  question,
  options,
  mode = 'single',
  selected,
  onSelect,
  allowFreeform = false,
  loading = false,
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
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <p className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Answered</p>
        <p className="text-zinc-300 text-sm">{question}</p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/30 border border-emerald-700/30 rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-emerald-300 text-sm">{display}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-zinc-800 border border-zinc-700 rounded-xl p-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
      <p className="text-zinc-200 text-sm font-medium mb-3">{question}</p>

      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => mode === 'single' ? handleSingleSelect(opt.value) : handleMultiToggle(opt.value)}
            disabled={loading}
            className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
              isSelected(opt.value)
                ? 'border-blue-500/50 bg-blue-500/10 text-zinc-100'
                : 'border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center gap-3">
              {/* Checkbox/radio indicator */}
              <div className={`shrink-0 w-4 h-4 rounded-${mode === 'multi' ? 'sm' : 'full'} border ${
                isSelected(opt.value)
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-zinc-600'
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
                  <p className="text-zinc-500 text-xs mt-0.5">{opt.description}</p>
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
          className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Confirm ({multiSelected.size} selected)
        </button>
      )}

      {/* Freeform input */}
      {allowFreeform && (
        <div className="mt-3 pt-3 border-t border-zinc-700">
          {!showFreeform ? (
            <button
              onClick={() => setShowFreeform(true)}
              className="text-zinc-500 text-xs hover:text-zinc-400 transition-colors"
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
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              />
              <button
                onClick={handleFreeformSubmit}
                disabled={loading || !freeformValue.trim()}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

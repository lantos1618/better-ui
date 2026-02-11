'use client';

import React from 'react';

// ============================================
// Types
// ============================================

export interface ProgressStep {
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  detail?: string;
}

export interface ProgressViewProps {
  /** Title above the progress indicator */
  title?: string;
  /** Step-based mode */
  steps?: ProgressStep[];
  /** Bar mode — percentage 0-100 */
  percent?: number;
  /** Label for bar mode */
  label?: string;
  /** Loading/animating state */
  loading?: boolean;
}

// ============================================
// Component
// ============================================

export function ProgressView({
  title,
  steps,
  percent,
  label,
  loading = false,
}: ProgressViewProps) {
  // Bar mode
  if (percent != null && !steps) {
    const clamped = Math.max(0, Math.min(100, percent));
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        {title && <p className="text-zinc-300 text-sm font-medium mb-3">{title}</p>}
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-zinc-400 text-xs">{label}</span>}
          <span className="text-zinc-400 text-xs font-mono ml-auto">{clamped}%</span>
        </div>
        <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              clamped >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
            }`}
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
    );
  }

  // Step mode
  if (!steps || steps.length === 0) return null;

  const done = steps.filter(s => s.status === 'done').length;
  const pct = steps.length > 0 ? (done / steps.length) * 100 : 0;

  return (
    <div className={`bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden transition-opacity ${loading ? 'opacity-70' : ''}`}>
      {/* Header */}
      {title && (
        <div className="px-4 py-3 border-b border-zinc-700">
          <div className="flex items-center justify-between">
            <p className="text-zinc-300 text-sm font-medium">{title}</p>
            <span className="text-zinc-500 text-xs font-mono">{done}/{steps.length}</span>
          </div>
          <div className="mt-2 h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="divide-y divide-zinc-700/50">
        {steps.map((step, i) => (
          <div key={i} className="px-4 py-2.5 flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {step.status === 'pending' && (
                <div className="w-4 h-4 rounded-full border border-zinc-600" />
              )}
              {step.status === 'active' && (
                <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                </div>
              )}
              {step.status === 'done' && (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {step.status === 'error' && (
                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${
                step.status === 'done' ? 'text-zinc-400 line-through' :
                step.status === 'error' ? 'text-red-400' :
                step.status === 'active' ? 'text-zinc-100' :
                'text-zinc-400'
              }`}>
                {step.label}
              </p>
              {step.detail && (
                <p className={`text-xs mt-0.5 ${step.status === 'error' ? 'text-red-500' : 'text-zinc-500'}`}>
                  {step.detail}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import React from 'react';

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
  /** Additional CSS class for the root element */
  className?: string;
}

export function ProgressView({
  title,
  steps,
  percent,
  label,
  loading = false,
  className,
}: ProgressViewProps) {
  // Bar mode
  if (percent != null && !steps) {
    const clamped = Math.max(0, Math.min(100, percent));
    return (
      <div className={`bg-[var(--bui-bg-elevated,#27272a)] border border-[var(--bui-border-strong,#3f3f46)] rounded-xl p-4 ${className || ''}`}>
        {title && <p className="text-[var(--bui-fg-secondary,#a1a1aa)] text-sm font-medium mb-3">{title}</p>}
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-[var(--bui-fg-secondary,#a1a1aa)] text-xs">{label}</span>}
          <span className="text-[var(--bui-fg-secondary,#a1a1aa)] text-xs font-mono ml-auto">{clamped}%</span>
        </div>
        <div className="h-2 bg-[var(--bui-bg-hover,#3f3f46)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              clamped >= 100 ? 'bg-[var(--bui-success,#059669)]' : 'bg-[var(--bui-primary-hover,#3b82f6)]'
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
    <div className={`bg-[var(--bui-bg-elevated,#27272a)] border border-[var(--bui-border-strong,#3f3f46)] rounded-xl overflow-hidden transition-opacity ${loading ? 'opacity-70' : ''} ${className || ''}`}>
      {/* Header */}
      {title && (
        <div className="px-4 py-3 border-b border-[var(--bui-border-strong,#3f3f46)]">
          <div className="flex items-center justify-between">
            <p className="text-[var(--bui-fg-secondary,#a1a1aa)] text-sm font-medium">{title}</p>
            <span className="text-[var(--bui-fg-muted,#71717a)] text-xs font-mono">{done}/{steps.length}</span>
          </div>
          <div className="mt-2 h-1 bg-[var(--bui-bg-hover,#3f3f46)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--bui-success,#059669)] rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="divide-y divide-[var(--bui-border-strong,#3f3f46)]/50">
        {steps.map((step, i) => (
          <div key={i} className="px-4 py-2.5 flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {step.status === 'pending' && (
                <div className="w-4 h-4 rounded-full border border-[var(--bui-border-strong,#3f3f46)]" />
              )}
              {step.status === 'active' && (
                <div className="w-4 h-4 rounded-full bg-[var(--bui-primary-muted,#1e3a5f)] flex items-center justify-center">
                  <div className="w-2 h-2 bg-[var(--bui-primary-hover,#3b82f6)] rounded-full animate-pulse" />
                </div>
              )}
              {step.status === 'done' && (
                <svg className="w-4 h-4 text-[var(--bui-success-fg,#6ee7b7)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {step.status === 'error' && (
                <svg className="w-4 h-4 text-[var(--bui-error-fg,#f87171)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${
                step.status === 'done' ? 'text-[var(--bui-fg-secondary,#a1a1aa)] line-through' :
                step.status === 'error' ? 'text-[var(--bui-error-fg,#f87171)]' :
                step.status === 'active' ? 'text-[var(--bui-fg,#f4f4f5)]' :
                'text-[var(--bui-fg-secondary,#a1a1aa)]'
              }`}>
                {step.label}
              </p>
              {step.detail && (
                <p className={`text-xs mt-0.5 ${step.status === 'error' ? 'text-[var(--bui-error-fg,#f87171)]' : 'text-[var(--bui-fg-muted,#71717a)]'}`}>
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

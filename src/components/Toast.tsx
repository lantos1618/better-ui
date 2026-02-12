'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  /** Auto-dismiss after ms (0 = manual dismiss) */
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, type?: Toast['type'], duration?: number) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Hook to show toasts from any component.
 * Must be used within a ToastProvider.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children, className }: { children: React.ReactNode; className?: string }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const toast = useCallback((message: string, type: Toast['type'] = 'info', duration = 4000) => {
    const id = `toast-${++counterRef.current}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} className={className} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
  className,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  className?: string;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm ${className || ''}`}>
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    if (t.duration && t.duration > 0) {
      const timer = setTimeout(() => onDismiss(t.id), t.duration);
      return () => clearTimeout(timer);
    }
  }, [t.id, t.duration, onDismiss]);

  const colors = {
    success: 'border-[var(--bui-success-border,rgba(4,120,87,0.3))] bg-[var(--bui-success-muted,rgba(16,185,129,0.12))]',
    error: 'border-[var(--bui-error-border,rgba(153,27,27,0.5))] bg-[var(--bui-error-muted,rgba(220,38,38,0.08))]',
    warning: 'border-[var(--bui-warning-border,rgba(180,83,9,0.5))] bg-[var(--bui-warning-muted,rgba(245,158,11,0.12))]',
    info: 'border-[var(--bui-primary-border,#2563eb80)] bg-[var(--bui-primary-muted,#1e3a5f)]',
  };

  const dotColors = {
    success: 'bg-[var(--bui-success-fg,#6ee7b7)]',
    error: 'bg-[var(--bui-error-fg,#f87171)]',
    warning: 'bg-[var(--bui-warning-fg,#f59e0b)]',
    info: 'bg-[var(--bui-primary-hover,#3b82f6)]',
  };

  const textColors = {
    success: 'text-[var(--bui-success-fg,#6ee7b7)]',
    error: 'text-[var(--bui-error-fg,#f87171)]',
    warning: 'text-[var(--bui-warning-fg,#f59e0b)]',
    info: 'text-[var(--bui-primary-hover,#3b82f6)]',
  };

  return (
    <div
      className={`border rounded-lg px-4 py-3 bg-[var(--bui-bg-surface,#18181b)] shadow-lg animate-in slide-in-from-right ${colors[t.type]}`}
      style={{ animation: 'slideIn 0.2s ease-out' }}
    >
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[t.type]}`} />
        <p className={`text-sm flex-1 ${textColors[t.type]}`}>{t.message}</p>
        <button
          onClick={() => onDismiss(t.id)}
          className="text-[var(--bui-fg-muted,#71717a)] hover:text-[var(--bui-fg-secondary,#a1a1aa)] text-xs shrink-0 ml-2"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

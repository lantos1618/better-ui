'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

// ============================================
// Types
// ============================================

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

// ============================================
// Context
// ============================================

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

// ============================================
// Provider + Container
// ============================================

export function ToastProvider({ children }: { children: React.ReactNode }) {
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
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ============================================
// Container
// ============================================

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ============================================
// Individual toast
// ============================================

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    if (t.duration && t.duration > 0) {
      const timer = setTimeout(() => onDismiss(t.id), t.duration);
      return () => clearTimeout(timer);
    }
  }, [t.id, t.duration, onDismiss]);

  const colors = {
    success: 'border-emerald-700/50 bg-emerald-900/20',
    error: 'border-red-700/50 bg-red-900/20',
    warning: 'border-amber-700/50 bg-amber-900/20',
    info: 'border-blue-700/50 bg-blue-900/20',
  };

  const dotColors = {
    success: 'bg-emerald-400',
    error: 'bg-red-400',
    warning: 'bg-amber-400',
    info: 'bg-blue-400',
  };

  const textColors = {
    success: 'text-emerald-200',
    error: 'text-red-200',
    warning: 'text-amber-200',
    info: 'text-blue-200',
  };

  return (
    <div
      className={`border rounded-lg px-4 py-3 bg-zinc-900 shadow-lg animate-in slide-in-from-right ${colors[t.type]}`}
      style={{ animation: 'slideIn 0.2s ease-out' }}
    >
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[t.type]}`} />
        <p className={`text-sm flex-1 ${textColors[t.type]}`}>{t.message}</p>
        <button
          onClick={() => onDismiss(t.id)}
          className="text-zinc-500 hover:text-zinc-300 text-xs shrink-0 ml-2"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

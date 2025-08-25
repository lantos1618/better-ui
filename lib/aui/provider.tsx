'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import aui, { AUI, AUIContext } from './index';

interface AUIProviderProps {
  children: ReactNode;
  instance?: AUI;
  context?: Partial<AUIContext>;
}

const AUIReactContext = createContext<{
  aui: AUI;
  context: AUIContext;
} | null>(null);

export function AUIProvider({ 
  children, 
  instance = aui,
  context: contextOverrides = {}
}: AUIProviderProps) {
  const value = useMemo(() => ({
    aui: instance,
    context: instance.createContext(contextOverrides)
  }), [instance, contextOverrides]);

  return (
    <AUIReactContext.Provider value={value}>
      {children}
    </AUIReactContext.Provider>
  );
}

export function useAUIContext() {
  const context = useContext(AUIReactContext);
  if (!context) {
    throw new Error('useAUIContext must be used within AUIProvider');
  }
  return context;
}

export function useAUIInstance() {
  const { aui } = useAUIContext();
  return aui;
}
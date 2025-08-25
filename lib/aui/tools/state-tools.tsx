import { z } from 'zod';
import { createAITool } from '../ai-control';

const globalState = new Map<string, any>();
const stateListeners = new Map<string, Set<(value: any) => void>>();

export const stateSet = createAITool('state.set')
  .describe('Set a value in global state')
  .tag('state', 'storage', 'client')
  .input(z.object({
    key: z.string(),
    value: z.any(),
    persist: z.boolean().optional()
  }))
  .clientExecute(async ({ input }) => {
    globalState.set(input.key, input.value);
    
    if (input.persist && typeof window !== 'undefined') {
      localStorage.setItem(`aui_state_${input.key}`, JSON.stringify(input.value));
    }
    
    const listeners = stateListeners.get(input.key);
    if (listeners) {
      listeners.forEach(listener => listener(input.value));
    }
    
    return { key: input.key, value: input.value, persisted: input.persist };
  });

export const stateGet = createAITool('state.get')
  .describe('Get a value from global state')
  .tag('state', 'storage', 'client')
  .input(z.object({
    key: z.string(),
    fallback: z.any().optional()
  }))
  .clientExecute(async ({ input }) => {
    let value = globalState.get(input.key);
    
    if (value === undefined && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`aui_state_${input.key}`);
      if (stored) {
        value = JSON.parse(stored);
        globalState.set(input.key, value);
      }
    }
    
    return { 
      key: input.key, 
      value: value !== undefined ? value : input.fallback,
      found: value !== undefined
    };
  });

export const stateDelete = createAITool('state.delete')
  .describe('Delete a value from global state')
  .tag('state', 'storage', 'client')
  .input(z.object({
    key: z.string()
  }))
  .clientExecute(async ({ input }) => {
    const existed = globalState.has(input.key);
    globalState.delete(input.key);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`aui_state_${input.key}`);
    }
    
    return { key: input.key, deleted: existed };
  });

export const stateClear = createAITool('state.clear')
  .describe('Clear all state')
  .tag('state', 'storage', 'client')
  .input(z.object({
    includePersisted: z.boolean().optional()
  }))
  .clientExecute(async ({ input }) => {
    const size = globalState.size;
    globalState.clear();
    
    if (input.includePersisted && typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('aui_state_')) {
          localStorage.removeItem(key);
        }
      });
    }
    
    return { cleared: size };
  });

export const stateSubscribe = createAITool('state.subscribe')
  .describe('Subscribe to state changes')
  .tag('state', 'reactive', 'client')
  .input(z.object({
    key: z.string(),
    immediate: z.boolean().optional()
  }))
  .clientExecute(async ({ input }) => {
    if (!stateListeners.has(input.key)) {
      stateListeners.set(input.key, new Set());
    }
    
    const subscriptionId = Math.random().toString(36).substring(7);
    
    return {
      subscriptionId,
      key: input.key,
      subscribe: (callback: (value: any) => void) => {
        stateListeners.get(input.key)?.add(callback);
        
        if (input.immediate) {
          const currentValue = globalState.get(input.key);
          if (currentValue !== undefined) {
            callback(currentValue);
          }
        }
        
        return () => {
          stateListeners.get(input.key)?.delete(callback);
        };
      }
    };
  });

export const cookieSet = createAITool('cookie.set')
  .describe('Set a cookie')
  .tag('state', 'cookie', 'client')
  .input(z.object({
    name: z.string(),
    value: z.string(),
    expires: z.number().optional(),
    path: z.string().optional(),
    domain: z.string().optional(),
    secure: z.boolean().optional(),
    sameSite: z.enum(['strict', 'lax', 'none']).optional()
  }))
  .clientExecute(async ({ input }) => {
    let cookie = `${input.name}=${encodeURIComponent(input.value)}`;
    
    if (input.expires) {
      const date = new Date();
      date.setTime(date.getTime() + input.expires);
      cookie += `; expires=${date.toUTCString()}`;
    }
    
    if (input.path) cookie += `; path=${input.path}`;
    if (input.domain) cookie += `; domain=${input.domain}`;
    if (input.secure) cookie += '; secure';
    if (input.sameSite) cookie += `; samesite=${input.sameSite}`;
    
    document.cookie = cookie;
    
    return { name: input.name, value: input.value, set: true };
  });

export const cookieGet = createAITool('cookie.get')
  .describe('Get a cookie value')
  .tag('state', 'cookie', 'client')
  .input(z.object({
    name: z.string()
  }))
  .clientExecute(async ({ input }) => {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === input.name) {
        return { name: input.name, value: decodeURIComponent(value), found: true };
      }
    }
    return { name: input.name, value: null, found: false };
  });

export const sessionSet = createAITool('session.set')
  .describe('Set a value in session storage')
  .tag('state', 'session', 'client')
  .input(z.object({
    key: z.string(),
    value: z.any()
  }))
  .clientExecute(async ({ input }) => {
    if (typeof window === 'undefined') {
      throw new Error('Session storage not available');
    }
    
    sessionStorage.setItem(input.key, JSON.stringify(input.value));
    return { key: input.key, value: input.value };
  });

export const sessionGet = createAITool('session.get')
  .describe('Get a value from session storage')
  .tag('state', 'session', 'client')
  .input(z.object({
    key: z.string()
  }))
  .clientExecute(async ({ input }) => {
    if (typeof window === 'undefined') {
      throw new Error('Session storage not available');
    }
    
    const value = sessionStorage.getItem(input.key);
    return { 
      key: input.key, 
      value: value ? JSON.parse(value) : null,
      found: value !== null
    };
  });
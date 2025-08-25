import { z } from 'zod';
import { createAITool } from '../ai-control';

export const navigate = createAITool('navigate')
  .describe('Navigate to a different page or URL')
  .tag('navigation', 'routing', 'client')
  .input(z.object({
    url: z.string(),
    newTab: z.boolean().optional(),
    replace: z.boolean().optional()
  }))
  .clientExecute(async ({ input }) => {
    if (input.newTab) {
      window.open(input.url, '_blank');
    } else if (input.replace) {
      window.location.replace(input.url);
    } else {
      window.location.href = input.url;
    }
    return { navigated: true, url: input.url };
  });

export const back = createAITool('navigate.back')
  .describe('Go back in browser history')
  .tag('navigation', 'history', 'client')
  .input(z.object({
    steps: z.number().optional().default(1)
  }))
  .clientExecute(async ({ input }) => {
    const steps = input.steps || 1;
    window.history.go(-steps);
    return { back: steps };
  });

export const forward = createAITool('navigate.forward')
  .describe('Go forward in browser history')
  .tag('navigation', 'history', 'client')
  .input(z.object({
    steps: z.number().optional().default(1)
  }))
  .clientExecute(async ({ input }) => {
    const steps = input.steps || 1;
    window.history.go(steps);
    return { forward: steps };
  });

export const reload = createAITool('navigate.reload')
  .describe('Reload the current page')
  .tag('navigation', 'page', 'client')
  .input(z.object({
    force: z.boolean().optional()
  }))
  .clientExecute(async ({ input }) => {
    window.location.reload();
    return { reloading: true };
  });

export const pushState = createAITool('navigate.pushState')
  .describe('Push a new state to browser history')
  .tag('navigation', 'history', 'client')
  .input(z.object({
    url: z.string(),
    state: z.any().optional(),
    title: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    window.history.pushState(input.state, input.title || '', input.url);
    return { pushed: true, url: input.url };
  });

export const replaceState = createAITool('navigate.replaceState')
  .describe('Replace current state in browser history')
  .tag('navigation', 'history', 'client')
  .input(z.object({
    url: z.string(),
    state: z.any().optional(),
    title: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    window.history.replaceState(input.state, input.title || '', input.url);
    return { replaced: true, url: input.url };
  });

export const getLocation = createAITool('navigate.getLocation')
  .describe('Get current location information')
  .tag('navigation', 'location', 'client')
  .input(z.object({}))
  .clientExecute(async () => {
    return {
      href: window.location.href,
      protocol: window.location.protocol,
      host: window.location.host,
      hostname: window.location.hostname,
      port: window.location.port,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      origin: window.location.origin
    };
  });

export const getParams = createAITool('navigate.getParams')
  .describe('Get URL search parameters')
  .tag('navigation', 'params', 'client')
  .input(z.object({
    key: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    const params = new URLSearchParams(window.location.search);
    
    if (input.key) {
      return { 
        key: input.key, 
        value: params.get(input.key),
        found: params.has(input.key)
      };
    }
    
    const allParams: Record<string, string> = {};
    params.forEach((value, key) => {
      allParams[key] = value;
    });
    
    return { params: allParams };
  });

export const setParams = createAITool('navigate.setParams')
  .describe('Set URL search parameters')
  .tag('navigation', 'params', 'client')
  .input(z.object({
    params: z.record(z.string()),
    replace: z.boolean().optional()
  }))
  .clientExecute(async ({ input }) => {
    const url = new URL(window.location.href);
    
    Object.entries(input.params).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    });
    
    if (input.replace) {
      window.history.replaceState(null, '', url.toString());
    } else {
      window.history.pushState(null, '', url.toString());
    }
    
    return { params: input.params, url: url.toString() };
  });

export const setHash = createAITool('navigate.setHash')
  .describe('Set URL hash')
  .tag('navigation', 'hash', 'client')
  .input(z.object({
    hash: z.string(),
    scroll: z.boolean().optional()
  }))
  .clientExecute(async ({ input }) => {
    window.location.hash = input.hash;
    
    if (input.scroll && input.hash) {
      const element = document.querySelector(input.hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    
    return { hash: input.hash };
  });
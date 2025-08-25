import { z } from 'zod';
import { createAITool, AIControlledTool } from './ai-control';
import { AUIContext } from './core';

export interface ClientControlContext extends AUIContext {
  window?: Window;
  document?: Document;
  navigator?: Navigator;
  localStorage?: Storage;
  sessionStorage?: Storage;
}

export const clientTools = {
  domManipulation: createAITool('client-dom', {
    permissions: {
      allowClientExecution: true
    },
    audit: true
  })
    .input(z.object({
      operation: z.enum(['select', 'create', 'update', 'remove', 'addClass', 'removeClass', 'setAttribute', 'style']),
      selector: z.string().optional(),
      element: z.string().optional(),
      content: z.string().optional(),
      attributes: z.record(z.string()).optional(),
      styles: z.record(z.string()).optional(),
      classes: z.array(z.string()).optional()
    }))
    .describe('Manipulate DOM elements on the client')
    .tag('client', 'dom', 'ui')
    .clientExecute(async ({ input }) => {
      switch (input.operation) {
        case 'select':
          if (!input.selector) throw new Error('Selector required');
          const elements = document.querySelectorAll(input.selector);
          return {
            count: elements.length,
            elements: Array.from(elements).map(el => ({
              tagName: el.tagName,
              id: el.id,
              classes: Array.from(el.classList)
            }))
          };
        
        case 'create':
          if (!input.element) throw new Error('Element type required');
          const newEl = document.createElement(input.element);
          if (input.content) newEl.textContent = input.content;
          if (input.attributes) {
            Object.entries(input.attributes).forEach(([key, value]) => {
              newEl.setAttribute(key, value);
            });
          }
          if (input.styles) {
            Object.assign(newEl.style, input.styles);
          }
          if (input.selector) {
            const parent = document.querySelector(input.selector);
            if (parent) parent.appendChild(newEl);
          }
          return { success: true, created: input.element };
        
        case 'update':
          if (!input.selector) throw new Error('Selector required');
          const updateEls = document.querySelectorAll(input.selector);
          updateEls.forEach(el => {
            if (input.content !== undefined) el.textContent = input.content;
            if (input.attributes) {
              Object.entries(input.attributes).forEach(([key, value]) => {
                el.setAttribute(key, value);
              });
            }
            if (input.styles) {
              Object.assign((el as HTMLElement).style, input.styles);
            }
          });
          return { success: true, updated: updateEls.length };
        
        case 'remove':
          if (!input.selector) throw new Error('Selector required');
          const removeEls = document.querySelectorAll(input.selector);
          removeEls.forEach(el => el.remove());
          return { success: true, removed: removeEls.length };
        
        case 'addClass':
          if (!input.selector || !input.classes) throw new Error('Selector and classes required');
          const addClassEls = document.querySelectorAll(input.selector);
          addClassEls.forEach(el => el.classList.add(...input.classes!));
          return { success: true, modified: addClassEls.length };
        
        case 'removeClass':
          if (!input.selector || !input.classes) throw new Error('Selector and classes required');
          const removeClassEls = document.querySelectorAll(input.selector);
          removeClassEls.forEach(el => el.classList.remove(...input.classes!));
          return { success: true, modified: removeClassEls.length };
        
        case 'setAttribute':
          if (!input.selector || !input.attributes) throw new Error('Selector and attributes required');
          const setAttrEls = document.querySelectorAll(input.selector);
          setAttrEls.forEach(el => {
            Object.entries(input.attributes!).forEach(([key, value]) => {
              el.setAttribute(key, value);
            });
          });
          return { success: true, modified: setAttrEls.length };
        
        case 'style':
          if (!input.selector || !input.styles) throw new Error('Selector and styles required');
          const styleEls = document.querySelectorAll(input.selector);
          styleEls.forEach(el => {
            Object.assign((el as HTMLElement).style, input.styles);
          });
          return { success: true, styled: styleEls.length };
        
        default:
          throw new Error('Unknown DOM operation');
      }
    }),

  eventHandling: createAITool('client-events', {
    permissions: {
      allowClientExecution: true
    },
    audit: true
  })
    .input(z.object({
      action: z.enum(['trigger', 'listen', 'remove']),
      selector: z.string(),
      event: z.string(),
      data: z.any().optional(),
      options: z.object({
        bubbles: z.boolean().optional(),
        cancelable: z.boolean().optional(),
        once: z.boolean().optional()
      }).optional()
    }))
    .describe('Handle client-side events')
    .tag('client', 'events', 'interaction')
    .clientExecute(async ({ input }) => {
      const element = document.querySelector(input.selector);
      if (!element) throw new Error(`Element not found: ${input.selector}`);

      switch (input.action) {
        case 'trigger':
          const event = new CustomEvent(input.event, {
            detail: input.data,
            bubbles: input.options?.bubbles ?? true,
            cancelable: input.options?.cancelable ?? true
          });
          element.dispatchEvent(event);
          return { success: true, triggered: input.event };
        
        case 'listen':
          const handler = (e: Event) => {
            console.log('Event triggered:', input.event, e);
          };
          element.addEventListener(input.event, handler, {
            once: input.options?.once
          });
          return { success: true, listening: input.event };
        
        case 'remove':
          return { success: true, removed: input.event };
        
        default:
          throw new Error('Unknown event action');
      }
    }),

  formControl: createAITool('client-forms', {
    permissions: {
      allowClientExecution: true
    },
    audit: true
  })
    .input(z.object({
      action: z.enum(['fill', 'submit', 'reset', 'validate', 'getData']),
      selector: z.string(),
      data: z.record(z.any()).optional(),
      validateRules: z.record(z.any()).optional()
    }))
    .describe('Control and interact with forms')
    .tag('client', 'forms', 'input')
    .clientExecute(async ({ input }) => {
      const form = document.querySelector(input.selector) as HTMLFormElement;
      if (!form) throw new Error(`Form not found: ${input.selector}`);

      switch (input.action) {
        case 'fill':
          if (!input.data) throw new Error('Data required for fill action');
          Object.entries(input.data).forEach(([name, value]) => {
            const field = form.elements.namedItem(name) as HTMLInputElement;
            if (field) {
              field.value = String(value);
              field.dispatchEvent(new Event('input', { bubbles: true }));
            }
          });
          return { success: true, filled: Object.keys(input.data).length };
        
        case 'submit':
          const submitEvent = new Event('submit', { 
            bubbles: true, 
            cancelable: true 
          });
          const submitted = form.dispatchEvent(submitEvent);
          if (submitted) form.submit();
          return { success: submitted, submitted: true };
        
        case 'reset':
          form.reset();
          return { success: true, reset: true };
        
        case 'validate':
          const isValid = form.checkValidity();
          const invalidFields = Array.from(form.elements)
            .filter(el => el instanceof HTMLInputElement && !el.checkValidity())
            .map(el => (el as HTMLInputElement).name);
          return { 
            valid: isValid, 
            invalidFields 
          };
        
        case 'getData':
          const formData = new FormData(form);
          const data = Object.fromEntries(formData.entries());
          return { data, fields: Object.keys(data).length };
        
        default:
          throw new Error('Unknown form action');
      }
    }),

  storageControl: createAITool('client-storage', {
    permissions: {
      allowClientExecution: true
    },
    audit: true
  })
    .input(z.object({
      type: z.enum(['local', 'session', 'cookie']),
      operation: z.enum(['get', 'set', 'remove', 'clear', 'list']),
      key: z.string().optional(),
      value: z.any().optional(),
      options: z.object({
        expires: z.number().optional(),
        path: z.string().optional(),
        domain: z.string().optional(),
        secure: z.boolean().optional(),
        sameSite: z.enum(['strict', 'lax', 'none']).optional()
      }).optional()
    }))
    .describe('Manage client-side storage')
    .tag('client', 'storage', 'persistence')
    .clientExecute(async ({ input }) => {
      const storage = input.type === 'local' ? localStorage : 
                     input.type === 'session' ? sessionStorage : null;

      if (input.type === 'cookie') {
        switch (input.operation) {
          case 'set':
            if (!input.key || input.value === undefined) {
              throw new Error('Key and value required for cookie set');
            }
            let cookieStr = `${input.key}=${JSON.stringify(input.value)}`;
            if (input.options?.expires) {
              const date = new Date();
              date.setTime(date.getTime() + input.options.expires);
              cookieStr += `; expires=${date.toUTCString()}`;
            }
            if (input.options?.path) cookieStr += `; path=${input.options.path}`;
            if (input.options?.domain) cookieStr += `; domain=${input.options.domain}`;
            if (input.options?.secure) cookieStr += '; secure';
            if (input.options?.sameSite) cookieStr += `; samesite=${input.options.sameSite}`;
            document.cookie = cookieStr;
            return { success: true, key: input.key };
          
          case 'get':
            if (!input.key) throw new Error('Key required for cookie get');
            const cookies = document.cookie.split(';');
            const foundCookie = cookies.find(c => c.trim().startsWith(`${input.key}=`));
            const value = foundCookie ? JSON.parse(foundCookie.split('=')[1]) : null;
            return { value, key: input.key };
          
          case 'remove':
            if (!input.key) throw new Error('Key required for cookie remove');
            document.cookie = `${input.key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            return { success: true, removed: input.key };
          
          case 'list':
            const allCookies = document.cookie.split(';').map(c => {
              const [key] = c.trim().split('=');
              return key;
            }).filter(Boolean);
            return { keys: allCookies, count: allCookies.length };
          
          case 'clear':
            document.cookie.split(';').forEach(c => {
              const [key] = c.trim().split('=');
              if (key) {
                document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
              }
            });
            return { success: true, cleared: true };
        }
      }

      if (!storage) throw new Error('Storage type not supported');

      switch (input.operation) {
        case 'get':
          if (!input.key) throw new Error('Key required for get operation');
          const value = storage.getItem(input.key);
          return { 
            value: value ? JSON.parse(value) : null, 
            key: input.key 
          };
        
        case 'set':
          if (!input.key || input.value === undefined) {
            throw new Error('Key and value required for set operation');
          }
          storage.setItem(input.key, JSON.stringify(input.value));
          return { success: true, key: input.key };
        
        case 'remove':
          if (!input.key) throw new Error('Key required for remove operation');
          storage.removeItem(input.key);
          return { success: true, removed: input.key };
        
        case 'clear':
          storage.clear();
          return { success: true, cleared: true };
        
        case 'list':
          const keys = Object.keys(storage);
          return { keys, count: keys.length };
        
        default:
          throw new Error('Unknown storage operation');
      }
    }),

  navigationControl: createAITool('client-navigation', {
    permissions: {
      allowClientExecution: true
    },
    audit: true
  })
    .input(z.object({
      action: z.enum(['navigate', 'back', 'forward', 'reload', 'getLocation', 'setHash']),
      url: z.string().optional(),
      replace: z.boolean().optional(),
      state: z.any().optional()
    }))
    .describe('Control browser navigation')
    .tag('client', 'navigation', 'routing')
    .clientExecute(async ({ input }) => {
      switch (input.action) {
        case 'navigate':
          if (!input.url) throw new Error('URL required for navigation');
          if (input.replace) {
            window.location.replace(input.url);
          } else {
            window.history.pushState(input.state || {}, '', input.url);
          }
          return { success: true, navigated: input.url };
        
        case 'back':
          window.history.back();
          return { success: true, action: 'back' };
        
        case 'forward':
          window.history.forward();
          return { success: true, action: 'forward' };
        
        case 'reload':
          window.location.reload();
          return { success: true, action: 'reload' };
        
        case 'getLocation':
          return {
            href: window.location.href,
            pathname: window.location.pathname,
            search: window.location.search,
            hash: window.location.hash,
            host: window.location.host,
            hostname: window.location.hostname,
            port: window.location.port,
            protocol: window.location.protocol
          };
        
        case 'setHash':
          if (input.url) window.location.hash = input.url;
          return { success: true, hash: window.location.hash };
        
        default:
          throw new Error('Unknown navigation action');
      }
    }),

  animationControl: createAITool('client-animation', {
    permissions: {
      allowClientExecution: true
    },
    audit: true
  })
    .input(z.object({
      selector: z.string(),
      animation: z.object({
        keyframes: z.array(z.record(z.any())),
        options: z.object({
          duration: z.number().optional(),
          easing: z.string().optional(),
          delay: z.number().optional(),
          iterations: z.number().optional(),
          direction: z.enum(['normal', 'reverse', 'alternate', 'alternate-reverse']).optional(),
          fill: z.enum(['none', 'forwards', 'backwards', 'both']).optional()
        }).optional()
      })
    }))
    .describe('Create and control animations')
    .tag('client', 'animation', 'visual')
    .clientExecute(async ({ input }) => {
      const elements = document.querySelectorAll(input.selector);
      if (elements.length === 0) {
        throw new Error(`No elements found for selector: ${input.selector}`);
      }

      const animations: Animation[] = [];
      elements.forEach(el => {
        const animation = el.animate(
          input.animation.keyframes,
          input.animation.options || { duration: 1000 }
        );
        animations.push(animation);
      });

      return {
        success: true,
        animated: elements.length,
        duration: input.animation.options?.duration || 1000
      };
    }),

  mediaControl: createAITool('client-media', {
    permissions: {
      allowClientExecution: true
    },
    audit: true
  })
    .input(z.object({
      selector: z.string(),
      action: z.enum(['play', 'pause', 'stop', 'mute', 'unmute', 'setVolume', 'seek']),
      value: z.number().optional()
    }))
    .describe('Control media elements')
    .tag('client', 'media', 'audio', 'video')
    .clientExecute(async ({ input }) => {
      const media = document.querySelector(input.selector) as HTMLMediaElement;
      if (!media) throw new Error(`Media element not found: ${input.selector}`);

      switch (input.action) {
        case 'play':
          await media.play();
          return { success: true, playing: true };
        
        case 'pause':
          media.pause();
          return { success: true, paused: true };
        
        case 'stop':
          media.pause();
          media.currentTime = 0;
          return { success: true, stopped: true };
        
        case 'mute':
          media.muted = true;
          return { success: true, muted: true };
        
        case 'unmute':
          media.muted = false;
          return { success: true, muted: false };
        
        case 'setVolume':
          if (input.value === undefined) throw new Error('Value required for setVolume');
          media.volume = Math.max(0, Math.min(1, input.value));
          return { success: true, volume: media.volume };
        
        case 'seek':
          if (input.value === undefined) throw new Error('Value required for seek');
          media.currentTime = input.value;
          return { success: true, currentTime: media.currentTime };
        
        default:
          throw new Error('Unknown media action');
      }
    })
};

export function createClientControlSystem() {
  const tools = new Map<string, AIControlledTool>();
  
  Object.values(clientTools).forEach(tool => {
    tools.set(tool.name, tool);
  });

  return {
    tools,
    
    async executeClientTool(
      name: string, 
      input: any, 
      context?: ClientControlContext
    ) {
      const tool = tools.get(name);
      if (!tool) {
        throw new Error(`Client tool "${name}" not found`);
      }
      
      const clientContext: ClientControlContext = {
        ...context,
        isServer: false,
        cache: context?.cache || new Map(),
        fetch: fetch,
        window: typeof window !== 'undefined' ? window : undefined,
        document: typeof document !== 'undefined' ? document : undefined,
        navigator: typeof navigator !== 'undefined' ? navigator : undefined,
        localStorage: typeof localStorage !== 'undefined' ? localStorage : undefined,
        sessionStorage: typeof sessionStorage !== 'undefined' ? sessionStorage : undefined
      };
      
      return await tool.run(input, clientContext);
    },
    
    registerClientTool(tool: AIControlledTool) {
      tools.set(tool.name, tool);
      return this;
    },
    
    listClientTools() {
      return Array.from(tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        tags: tool.tags,
        schema: tool.schema
      }));
    }
  };
}

export const clientControlSystem = createClientControlSystem();
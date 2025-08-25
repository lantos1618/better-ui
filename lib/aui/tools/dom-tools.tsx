import React from 'react';
import { z } from 'zod';
import { createAITool } from '../ai-control';

export const domClick = createAITool('dom.click')
  .describe('Click on a DOM element')
  .tag('dom', 'interaction', 'client')
  .input(z.object({
    selector: z.string().describe('CSS selector for the element'),
    wait: z.number().optional().describe('Wait time in ms before clicking')
  }))
  .clientExecute(async ({ input }) => {
    if (input.wait) {
      await new Promise(resolve => setTimeout(resolve, input.wait));
    }
    const element = document.querySelector(input.selector) as HTMLElement;
    if (!element) throw new Error(`Element not found: ${input.selector}`);
    element.click();
    return { success: true, selector: input.selector, timestamp: Date.now() };
  })
  .render(({ data }) => (
    <span className="text-green-600">✓ Clicked {data.selector}</span>
  ));

export const domType = createAITool('dom.type')
  .describe('Type text into an input element')
  .tag('dom', 'input', 'client')
  .input(z.object({
    selector: z.string(),
    text: z.string(),
    clear: z.boolean().optional().describe('Clear field before typing'),
    delay: z.number().optional().describe('Delay between keystrokes in ms')
  }))
  .clientExecute(async ({ input }) => {
    const element = document.querySelector(input.selector) as HTMLInputElement;
    if (!element) throw new Error(`Element not found: ${input.selector}`);
    
    if (input.clear) {
      element.value = '';
    }
    
    if (input.delay) {
      for (const char of input.text) {
        element.value += char;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, input.delay));
      }
    } else {
      element.value = input.clear ? input.text : element.value + input.text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return { success: true, selector: input.selector, text: input.text };
  })
  .render(({ data }) => (
    <span className="text-blue-600">✓ Typed &quot;{data.text}&quot; into {data.selector}</span>
  ));

export const domSelect = createAITool('dom.select')
  .describe('Select an option from a dropdown')
  .tag('dom', 'input', 'client')
  .input(z.object({
    selector: z.string(),
    value: z.string().optional(),
    index: z.number().optional(),
    text: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    const element = document.querySelector(input.selector) as HTMLSelectElement;
    if (!element) throw new Error(`Element not found: ${input.selector}`);
    
    if (input.value !== undefined) {
      element.value = input.value;
    } else if (input.index !== undefined) {
      element.selectedIndex = input.index;
    } else if (input.text) {
      const option = Array.from(element.options).find(opt => opt.text === input.text);
      if (option) element.value = option.value;
    }
    
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return { success: true, selector: input.selector, value: element.value };
  });

export const domScroll = createAITool('dom.scroll')
  .describe('Scroll to an element or position')
  .tag('dom', 'navigation', 'client')
  .input(z.object({
    selector: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    behavior: z.enum(['auto', 'smooth']).optional()
  }))
  .clientExecute(async ({ input }) => {
    if (input.selector) {
      const element = document.querySelector(input.selector);
      if (!element) throw new Error(`Element not found: ${input.selector}`);
      element.scrollIntoView({ behavior: input.behavior || 'smooth' });
    } else {
      window.scrollTo({
        left: input.x || 0,
        top: input.y || 0,
        behavior: input.behavior || 'smooth'
      });
    }
    return { success: true, scrolled: true };
  });

export const domWaitFor = createAITool('dom.waitFor')
  .describe('Wait for an element to appear')
  .tag('dom', 'utility', 'client')
  .input(z.object({
    selector: z.string(),
    timeout: z.number().optional().default(5000),
    interval: z.number().optional().default(100)
  }))
  .clientExecute(async ({ input }) => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < input.timeout) {
      const element = document.querySelector(input.selector);
      if (element) {
        return { success: true, found: true, selector: input.selector };
      }
      await new Promise(resolve => setTimeout(resolve, input.interval));
    }
    
    throw new Error(`Element ${input.selector} not found after ${input.timeout}ms`);
  });

export const domGetText = createAITool('dom.getText')
  .describe('Get text content from elements')
  .tag('dom', 'read', 'client')
  .input(z.object({
    selector: z.string(),
    all: z.boolean().optional()
  }))
  .clientExecute(async ({ input }) => {
    if (input.all) {
      const elements = document.querySelectorAll(input.selector);
      const texts = Array.from(elements).map(el => el.textContent || '');
      return { texts, count: texts.length };
    } else {
      const element = document.querySelector(input.selector);
      if (!element) throw new Error(`Element not found: ${input.selector}`);
      return { text: element.textContent || '' };
    }
  });

export const domGetAttribute = createAITool('dom.getAttribute')
  .describe('Get attribute value from an element')
  .tag('dom', 'read', 'client')
  .input(z.object({
    selector: z.string(),
    attribute: z.string()
  }))
  .clientExecute(async ({ input }) => {
    const element = document.querySelector(input.selector);
    if (!element) throw new Error(`Element not found: ${input.selector}`);
    return { value: element.getAttribute(input.attribute) };
  });

export const domSetAttribute = createAITool('dom.setAttribute')
  .describe('Set attribute value on an element')
  .tag('dom', 'modify', 'client')
  .input(z.object({
    selector: z.string(),
    attribute: z.string(),
    value: z.string()
  }))
  .clientExecute(async ({ input }) => {
    const element = document.querySelector(input.selector);
    if (!element) throw new Error(`Element not found: ${input.selector}`);
    element.setAttribute(input.attribute, input.value);
    return { success: true, selector: input.selector, attribute: input.attribute };
  });

export const domToggleClass = createAITool('dom.toggleClass')
  .describe('Toggle CSS class on elements')
  .tag('dom', 'style', 'client')
  .input(z.object({
    selector: z.string(),
    className: z.string(),
    action: z.enum(['add', 'remove', 'toggle']).optional()
  }))
  .clientExecute(async ({ input }) => {
    const elements = document.querySelectorAll(input.selector);
    elements.forEach(element => {
      if (input.action === 'add') {
        element.classList.add(input.className);
      } else if (input.action === 'remove') {
        element.classList.remove(input.className);
      } else {
        element.classList.toggle(input.className);
      }
    });
    return { success: true, affected: elements.length };
  });
import React from 'react';
import { z } from 'zod';
import { createAITool } from '../ai-control';

export const notifyToast = createAITool('notify.toast')
  .describe('Show a toast notification')
  .tag('notification', 'ui', 'client')
  .input(z.object({
    message: z.string(),
    type: z.enum(['success', 'error', 'warning', 'info']).optional(),
    duration: z.number().optional().default(3000),
    position: z.enum(['top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).optional()
  }))
  .clientExecute(async ({ input }) => {
    const toast = document.createElement('div');
    toast.className = `aui-toast aui-toast-${input.type || 'info'}`;
    toast.textContent = input.message;
    
    const styles: any = {
      position: 'fixed',
      padding: '12px 24px',
      borderRadius: '4px',
      zIndex: '9999',
      transition: 'opacity 0.3s',
      fontSize: '14px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    };
    
    const typeStyles: any = {
      success: { backgroundColor: '#10b981', color: 'white' },
      error: { backgroundColor: '#ef4444', color: 'white' },
      warning: { backgroundColor: '#f59e0b', color: 'white' },
      info: { backgroundColor: '#3b82f6', color: 'white' }
    };
    
    const positionStyles: any = {
      top: { top: '20px', left: '50%', transform: 'translateX(-50%)' },
      bottom: { bottom: '20px', left: '50%', transform: 'translateX(-50%)' },
      'top-left': { top: '20px', left: '20px' },
      'top-right': { top: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'bottom-right': { bottom: '20px', right: '20px' }
    };
    
    Object.assign(toast.style, styles, typeStyles[input.type || 'info'], positionStyles[input.position || 'top']);
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, input.duration);
    
    return { shown: true, message: input.message };
  });

export const notifyAlert = createAITool('notify.alert')
  .describe('Show a browser alert dialog')
  .tag('notification', 'dialog', 'client')
  .input(z.object({
    message: z.string(),
    title: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    window.alert(input.message);
    return { shown: true };
  });

export const notifyConfirm = createAITool('notify.confirm')
  .describe('Show a confirmation dialog')
  .tag('notification', 'dialog', 'client')
  .input(z.object({
    message: z.string(),
    title: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    const confirmed = window.confirm(input.message);
    return { confirmed };
  });

export const notifyPrompt = createAITool('notify.prompt')
  .describe('Show a prompt dialog for user input')
  .tag('notification', 'dialog', 'client')
  .input(z.object({
    message: z.string(),
    defaultValue: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    const value = window.prompt(input.message, input.defaultValue);
    return { value, cancelled: value === null };
  });

export const notifyBadge = createAITool('notify.badge')
  .describe('Update badge count on an element')
  .tag('notification', 'ui', 'client')
  .input(z.object({
    selector: z.string(),
    count: z.number(),
    show: z.boolean().optional()
  }))
  .clientExecute(async ({ input }) => {
    const element = document.querySelector(input.selector);
    if (!element) throw new Error(`Element not found: ${input.selector}`);
    
    let badge = element.querySelector('.aui-badge') as HTMLElement;
    
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'aui-badge';
      badge.style.cssText = `
        position: absolute;
        top: -8px;
        right: -8px;
        background: #ef4444;
        color: white;
        border-radius: 10px;
        padding: 2px 6px;
        font-size: 12px;
        font-weight: bold;
        min-width: 20px;
        text-align: center;
      `;
      element.style.position = 'relative';
      element.appendChild(badge);
    }
    
    if (input.show === false || input.count === 0) {
      badge.style.display = 'none';
    } else {
      badge.style.display = 'block';
      badge.textContent = String(input.count);
    }
    
    return { selector: input.selector, count: input.count };
  });

export const notifyProgress = createAITool('notify.progress')
  .describe('Show or update a progress indicator')
  .tag('notification', 'ui', 'client')
  .input(z.object({
    id: z.string(),
    value: z.number().min(0).max(100),
    message: z.string().optional(),
    show: z.boolean().optional()
  }))
  .clientExecute(async ({ input }) => {
    let progress = document.getElementById(`aui-progress-${input.id}`) as HTMLElement;
    
    if (!progress) {
      progress = document.createElement('div');
      progress.id = `aui-progress-${input.id}`;
      progress.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 9999;
        min-width: 300px;
      `;
      
      const bar = document.createElement('div');
      bar.className = 'aui-progress-bar';
      bar.style.cssText = `
        width: 100%;
        height: 20px;
        background: #e5e7eb;
        border-radius: 10px;
        overflow: hidden;
        margin-top: 10px;
      `;
      
      const fill = document.createElement('div');
      fill.className = 'aui-progress-fill';
      fill.style.cssText = `
        height: 100%;
        background: #3b82f6;
        transition: width 0.3s;
        border-radius: 10px;
      `;
      
      const label = document.createElement('div');
      label.className = 'aui-progress-label';
      label.style.cssText = 'margin-bottom: 10px; font-family: system-ui;';
      
      bar.appendChild(fill);
      progress.appendChild(label);
      progress.appendChild(bar);
      document.body.appendChild(progress);
    }
    
    if (input.show === false) {
      progress.style.display = 'none';
    } else {
      progress.style.display = 'block';
      const fill = progress.querySelector('.aui-progress-fill') as HTMLElement;
      const label = progress.querySelector('.aui-progress-label') as HTMLElement;
      
      fill.style.width = `${input.value}%`;
      label.textContent = input.message || `${input.value}%`;
      
      if (input.value >= 100) {
        setTimeout(() => {
          progress.style.display = 'none';
        }, 1000);
      }
    }
    
    return { id: input.id, value: input.value };
  });
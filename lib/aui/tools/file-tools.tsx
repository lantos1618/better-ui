import { z } from 'zod';
import { createAITool } from '../ai-control';

export const fileUpload = createAITool('file.upload')
  .describe('Handle file uploads')
  .tag('file', 'upload', 'client')
  .input(z.object({
    accept: z.string().optional(),
    multiple: z.boolean().optional(),
    maxSize: z.number().optional()
  }))
  .clientExecute(async ({ input }) => {
    return new Promise((resolve, reject) => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      if (input.accept) fileInput.accept = input.accept;
      if (input.multiple) fileInput.multiple = true;
      
      fileInput.onchange = async (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        
        if (input.maxSize) {
          const oversized = files.filter(file => file.size > input.maxSize!);
          if (oversized.length > 0) {
            reject(new Error(`Files exceed max size: ${oversized.map(f => f.name).join(', ')}`));
            return;
          }
        }
        
        const fileData = await Promise.all(files.map(async file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          content: await file.text().catch(() => null)
        })));
        
        resolve({ files: fileData, count: fileData.length });
      };
      
      fileInput.click();
    });
  });

export const fileDownload = createAITool('file.download')
  .describe('Download a file')
  .tag('file', 'download', 'client')
  .input(z.object({
    content: z.string(),
    filename: z.string(),
    type: z.string().optional().default('text/plain')
  }))
  .clientExecute(async ({ input }) => {
    const blob = new Blob([input.content], { type: input.type });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = input.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    return { downloaded: true, filename: input.filename };
  });

export const fileRead = createAITool('file.read')
  .describe('Read file from input element')
  .tag('file', 'read', 'client')
  .input(z.object({
    selector: z.string(),
    readAs: z.enum(['text', 'dataURL', 'arrayBuffer']).optional().default('text')
  }))
  .clientExecute(async ({ input }) => {
    const fileInput = document.querySelector(input.selector) as HTMLInputElement;
    if (!fileInput) throw new Error(`Input not found: ${input.selector}`);
    if (!fileInput.files || fileInput.files.length === 0) {
      throw new Error('No files selected');
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = (e) => {
        resolve({
          name: file.name,
          size: file.size,
          type: file.type,
          content: e.target?.result,
          lastModified: file.lastModified
        });
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      switch (input.readAs) {
        case 'dataURL':
          reader.readAsDataURL(file);
          break;
        case 'arrayBuffer':
          reader.readAsArrayBuffer(file);
          break;
        default:
          reader.readAsText(file);
      }
    });
  });

export const fileDragDrop = createAITool('file.dragDrop')
  .describe('Setup drag and drop file handling')
  .tag('file', 'upload', 'client')
  .input(z.object({
    selector: z.string(),
    accept: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    const dropZone = document.querySelector(input.selector) as HTMLElement;
    if (!dropZone) throw new Error(`Element not found: ${input.selector}`);
    
    const dragId = Math.random().toString(36).substring(7);
    
    return {
      dragId,
      onDrop: (callback: (files: File[]) => void) => {
        const handleDragOver = (e: DragEvent) => {
          e.preventDefault();
          dropZone.classList.add('dragging');
        };
        
        const handleDragLeave = () => {
          dropZone.classList.remove('dragging');
        };
        
        const handleDrop = (e: DragEvent) => {
          e.preventDefault();
          dropZone.classList.remove('dragging');
          
          const files = Array.from(e.dataTransfer?.files || []);
          
          if (input.accept) {
            const acceptedTypes = input.accept.split(',').map(t => t.trim());
            const validFiles = files.filter(file => {
              return acceptedTypes.some(type => {
                if (type.startsWith('.')) {
                  return file.name.endsWith(type);
                }
                return file.type.match(type.replace('*', '.*'));
              });
            });
            callback(validFiles);
          } else {
            callback(files);
          }
        };
        
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
        
        return () => {
          dropZone.removeEventListener('dragover', handleDragOver);
          dropZone.removeEventListener('dragleave', handleDragLeave);
          dropZone.removeEventListener('drop', handleDrop);
        };
      }
    };
  });

export const filePreview = createAITool('file.preview')
  .describe('Preview file content')
  .tag('file', 'preview', 'client')
  .input(z.object({
    file: z.any(),
    targetSelector: z.string()
  }))
  .clientExecute(async ({ input }) => {
    const target = document.querySelector(input.targetSelector) as HTMLElement;
    if (!target) throw new Error(`Element not found: ${input.targetSelector}`);
    
    const file = input.file;
    
    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(new Blob([file.content]));
      img.style.maxWidth = '100%';
      target.innerHTML = '';
      target.appendChild(img);
    } else if (file.type.startsWith('text/') || file.type === 'application/json') {
      const pre = document.createElement('pre');
      pre.textContent = file.content;
      pre.style.cssText = 'white-space: pre-wrap; word-wrap: break-word;';
      target.innerHTML = '';
      target.appendChild(pre);
    } else {
      target.innerHTML = `<div>File: ${file.name} (${file.type})</div>`;
    }
    
    return { previewed: true, file: file.name };
  });
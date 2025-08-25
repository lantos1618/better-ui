import { z } from 'zod';
import { createAITool } from '../ai-control';

export const formSubmit = createAITool('form.submit')
  .describe('Submit a form')
  .tag('form', 'submission', 'client')
  .input(z.object({
    selector: z.string(),
    preventDefault: z.boolean().optional().default(true)
  }))
  .clientExecute(async ({ input }) => {
    const form = document.querySelector(input.selector) as HTMLFormElement;
    if (!form) throw new Error(`Form not found: ${input.selector}`);
    
    if (!input.preventDefault) {
      form.submit();
    } else {
      const event = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(event);
    }
    
    return { submitted: true, selector: input.selector };
  });

export const formReset = createAITool('form.reset')
  .describe('Reset a form to its default values')
  .tag('form', 'reset', 'client')
  .input(z.object({
    selector: z.string()
  }))
  .clientExecute(async ({ input }) => {
    const form = document.querySelector(input.selector) as HTMLFormElement;
    if (!form) throw new Error(`Form not found: ${input.selector}`);
    
    form.reset();
    return { reset: true, selector: input.selector };
  });

export const formFill = createAITool('form.fill')
  .describe('Fill multiple form fields at once')
  .tag('form', 'input', 'client')
  .input(z.object({
    formSelector: z.string(),
    values: z.record(z.any()),
    submit: z.boolean().optional()
  }))
  .clientExecute(async ({ input }) => {
    const form = document.querySelector(input.formSelector) as HTMLFormElement;
    if (!form) throw new Error(`Form not found: ${input.formSelector}`);
    
    const filled: Record<string, any> = {};
    
    Object.entries(input.values).forEach(([name, value]) => {
      const field = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      
      if (field) {
        if (field instanceof HTMLInputElement) {
          if (field.type === 'checkbox') {
            field.checked = Boolean(value);
          } else if (field.type === 'radio') {
            const radios = form.querySelectorAll(`input[name="${name}"]`) as NodeListOf<HTMLInputElement>;
            radios.forEach(radio => {
              radio.checked = radio.value === value;
            });
          } else {
            field.value = String(value);
          }
        } else {
          field.value = String(value);
        }
        
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        filled[name] = value;
      }
    });
    
    if (input.submit) {
      form.submit();
    }
    
    return { filled, submitted: input.submit };
  });

export const formValidate = createAITool('form.validate')
  .describe('Validate a form using HTML5 validation')
  .tag('form', 'validation', 'client')
  .input(z.object({
    selector: z.string(),
    showErrors: z.boolean().optional()
  }))
  .clientExecute(async ({ input }) => {
    const form = document.querySelector(input.selector) as HTMLFormElement;
    if (!form) throw new Error(`Form not found: ${input.selector}`);
    
    const isValid = form.checkValidity();
    const errors: Array<{ field: string; message: string }> = [];
    
    if (!isValid && input.showErrors) {
      const fields = form.querySelectorAll('input, select, textarea') as NodeListOf<HTMLInputElement>;
      fields.forEach(field => {
        if (!field.validity.valid) {
          errors.push({
            field: field.name || field.id,
            message: field.validationMessage
          });
          field.reportValidity();
        }
      });
    }
    
    return { valid: isValid, errors };
  });

export const formGetData = createAITool('form.getData')
  .describe('Get all form data as an object')
  .tag('form', 'read', 'client')
  .input(z.object({
    selector: z.string(),
    includeDisabled: z.boolean().optional()
  }))
  .clientExecute(async ({ input }) => {
    const form = document.querySelector(input.selector) as HTMLFormElement;
    if (!form) throw new Error(`Form not found: ${input.selector}`);
    
    const formData = new FormData(form);
    const data: Record<string, any> = {};
    
    formData.forEach((value, key) => {
      if (data[key]) {
        if (!Array.isArray(data[key])) {
          data[key] = [data[key]];
        }
        data[key].push(value);
      } else {
        data[key] = value;
      }
    });
    
    if (input.includeDisabled) {
      const disabledFields = form.querySelectorAll('[disabled]') as NodeListOf<HTMLInputElement>;
      disabledFields.forEach(field => {
        if (field.name && !(field.name in data)) {
          data[field.name] = field.value;
        }
      });
    }
    
    return { data };
  });

export const formSetError = createAITool('form.setError')
  .describe('Set custom validation error on a form field')
  .tag('form', 'validation', 'client')
  .input(z.object({
    selector: z.string(),
    message: z.string(),
    show: z.boolean().optional()
  }))
  .clientExecute(async ({ input }) => {
    const field = document.querySelector(input.selector) as HTMLInputElement;
    if (!field) throw new Error(`Field not found: ${input.selector}`);
    
    field.setCustomValidity(input.message);
    
    if (input.show) {
      field.reportValidity();
    }
    
    return { field: input.selector, message: input.message };
  });

export const formClearErrors = createAITool('form.clearErrors')
  .describe('Clear validation errors from form fields')
  .tag('form', 'validation', 'client')
  .input(z.object({
    selector: z.string()
  }))
  .clientExecute(async ({ input }) => {
    const form = document.querySelector(input.selector) as HTMLFormElement;
    if (!form) throw new Error(`Form not found: ${input.selector}`);
    
    const fields = form.querySelectorAll('input, select, textarea') as NodeListOf<HTMLInputElement>;
    fields.forEach(field => {
      field.setCustomValidity('');
    });
    
    return { cleared: true, fields: fields.length };
  });

export const formWatch = createAITool('form.watch')
  .describe('Watch form changes')
  .tag('form', 'reactive', 'client')
  .input(z.object({
    selector: z.string(),
    fields: z.array(z.string()).optional()
  }))
  .clientExecute(async ({ input }) => {
    const form = document.querySelector(input.selector) as HTMLFormElement;
    if (!form) throw new Error(`Form not found: ${input.selector}`);
    
    const watchId = Math.random().toString(36).substring(7);
    
    return {
      watchId,
      onChange: (callback: (data: Record<string, any>) => void) => {
        const handler = () => {
          const formData = new FormData(form);
          const data: Record<string, any> = {};
          
          if (input.fields) {
            input.fields.forEach(field => {
              data[field] = formData.get(field);
            });
          } else {
            formData.forEach((value, key) => {
              data[key] = value;
            });
          }
          
          callback(data);
        };
        
        form.addEventListener('input', handler);
        form.addEventListener('change', handler);
        
        return () => {
          form.removeEventListener('input', handler);
          form.removeEventListener('change', handler);
        };
      }
    };
  });
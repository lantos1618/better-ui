'use client';

import React, { useState } from 'react';

export interface FormField {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'email' | 'url' | 'textarea' | 'select' | 'toggle';
  required?: boolean;
  placeholder?: string;
  /** Options for select fields */
  options?: string[];
  defaultValue?: string;
  /** Hint text below the field */
  hint?: string;
}

export interface FormViewProps {
  /** Form title */
  title?: string;
  /** Description text */
  description?: string;
  /** Field definitions */
  fields: FormField[];
  /** Pre-filled values */
  values?: Record<string, string>;
  /** Whether the form has been submitted */
  submitted?: boolean;
  /** Submit button label */
  submitLabel?: string;
  /** Called with validated form data */
  onSubmit?: (values: Record<string, string>) => void;
  /** Loading state */
  loading?: boolean;
  /** Additional CSS class for the root element */
  className?: string;
}

export function FormView({
  title,
  description,
  fields,
  values: initialValues,
  submitted = false,
  submitLabel = 'Submit',
  onSubmit,
  loading = false,
  className,
}: FormViewProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const f of fields) {
      v[f.name] = initialValues?.[f.name] ?? f.defaultValue ?? '';
    }
    return v;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Validate required fields
    const newErrors: Record<string, string> = {};
    for (const f of fields) {
      if (f.required && !values[f.name]?.trim()) {
        newErrors[f.name] = `${f.label} is required`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit?.(values);
  };

  // Submitted state
  if (submitted && initialValues) {
    return (
      <div className={`bg-[var(--bui-bg-elevated,#27272a)] border border-[var(--bui-border-strong,#3f3f46)] rounded-xl p-4 ${className || ''}`}>
        {title && <p className="text-[var(--bui-fg-secondary,#a1a1aa)] text-xs uppercase tracking-wider mb-2">Submitted</p>}
        {title && <p className="text-[var(--bui-fg-secondary,#a1a1aa)] text-sm font-medium mb-3">{title}</p>}
        <div className="space-y-2">
          {fields.map((f) => (
            <div key={f.name} className="flex items-baseline gap-2">
              <span className="text-[var(--bui-fg-muted,#71717a)] text-xs min-w-[80px]">{f.label}:</span>
              <span className="text-[var(--bui-fg-secondary,#a1a1aa)] text-sm">{initialValues[f.name] || '-'}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-[var(--bui-success-muted,rgba(16,185,129,0.12))] rounded text-xs text-[var(--bui-success-fg,#6ee7b7)]">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--bui-success-fg,#6ee7b7)]" />
          Submitted
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-[var(--bui-bg-elevated,#27272a)] border border-[var(--bui-border-strong,#3f3f46)] rounded-xl p-4 transition-opacity ${loading ? 'opacity-60' : ''} ${className || ''}`}
    >
      {title && <p className="text-[var(--bui-fg,#f4f4f5)] text-sm font-medium mb-1">{title}</p>}
      {description && <p className="text-[var(--bui-fg-muted,#71717a)] text-xs mb-4">{description}</p>}

      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="block text-[var(--bui-fg-secondary,#a1a1aa)] text-xs mb-1">
              {field.label}
              {field.required && <span className="text-[var(--bui-error-fg,#f87171)] ml-0.5">*</span>}
            </label>

            {field.type === 'textarea' ? (
              <textarea
                value={values[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                disabled={loading}
                rows={3}
                className={`w-full bg-[var(--bui-bg-surface,#18181b)] border rounded-lg px-3 py-2 text-sm text-[var(--bui-fg,#f4f4f5)] placeholder-[var(--bui-fg-faint,#52525b)] focus:outline-none focus:border-[var(--bui-border-strong,#3f3f46)] resize-none ${
                  errors[field.name] ? 'border-[var(--bui-error-border,rgba(153,27,27,0.5))]' : 'border-[var(--bui-border-strong,#3f3f46)]'
                }`}
              />
            ) : field.type === 'select' ? (
              <select
                value={values[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                disabled={loading}
                className={`w-full bg-[var(--bui-bg-surface,#18181b)] border rounded-lg px-3 py-2 text-sm text-[var(--bui-fg,#f4f4f5)] focus:outline-none focus:border-[var(--bui-border-strong,#3f3f46)] ${
                  errors[field.name] ? 'border-[var(--bui-error-border,rgba(153,27,27,0.5))]' : 'border-[var(--bui-border-strong,#3f3f46)]'
                }`}
              >
                <option value="">{field.placeholder || 'Select...'}</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === 'toggle' ? (
              <button
                type="button"
                onClick={() => handleChange(field.name, values[field.name] === 'true' ? 'false' : 'true')}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <div className={`w-8 h-4.5 rounded-full transition-colors ${
                  values[field.name] === 'true' ? 'bg-[var(--bui-primary-hover,#3b82f6)]' : 'bg-[var(--bui-bg-hover,#3f3f46)]'
                }`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white mt-0.5 transition-transform ${
                    values[field.name] === 'true' ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
                <span className="text-[var(--bui-fg-secondary,#a1a1aa)] text-xs">{values[field.name] === 'true' ? 'On' : 'Off'}</span>
              </button>
            ) : (
              <input
                type={field.type || 'text'}
                value={values[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                disabled={loading}
                className={`w-full bg-[var(--bui-bg-surface,#18181b)] border rounded-lg px-3 py-2 text-sm text-[var(--bui-fg,#f4f4f5)] placeholder-[var(--bui-fg-faint,#52525b)] focus:outline-none focus:border-[var(--bui-border-strong,#3f3f46)] ${
                  errors[field.name] ? 'border-[var(--bui-error-border,rgba(153,27,27,0.5))]' : 'border-[var(--bui-border-strong,#3f3f46)]'
                }`}
              />
            )}

            {errors[field.name] && (
              <p className="text-[var(--bui-error-fg,#f87171)] text-xs mt-1">{errors[field.name]}</p>
            )}
            {field.hint && !errors[field.name] && (
              <p className="text-[var(--bui-fg-faint,#52525b)] text-xs mt-1">{field.hint}</p>
            )}
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 px-4 py-2 bg-[var(--bui-primary,#2563eb)] text-white text-sm rounded-lg hover:bg-[var(--bui-primary-hover,#3b82f6)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Submitting...' : submitLabel}
      </button>
    </form>
  );
}

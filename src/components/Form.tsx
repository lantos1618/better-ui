'use client';

import React, { useState } from 'react';

// ============================================
// Types
// ============================================

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
}

// ============================================
// Component
// ============================================

export function FormView({
  title,
  description,
  fields,
  values: initialValues,
  submitted = false,
  submitLabel = 'Submit',
  onSubmit,
  loading = false,
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
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        {title && <p className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Submitted</p>}
        {title && <p className="text-zinc-300 text-sm font-medium mb-3">{title}</p>}
        <div className="space-y-2">
          {fields.map((f) => (
            <div key={f.name} className="flex items-baseline gap-2">
              <span className="text-zinc-500 text-xs min-w-[80px]">{f.label}:</span>
              <span className="text-zinc-300 text-sm">{initialValues[f.name] || '-'}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-900/30 rounded text-xs text-emerald-400">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Submitted
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-zinc-800 border border-zinc-700 rounded-xl p-4 transition-opacity ${loading ? 'opacity-60' : ''}`}
    >
      {title && <p className="text-zinc-200 text-sm font-medium mb-1">{title}</p>}
      {description && <p className="text-zinc-500 text-xs mb-4">{description}</p>}

      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="block text-zinc-400 text-xs mb-1">
              {field.label}
              {field.required && <span className="text-red-400 ml-0.5">*</span>}
            </label>

            {field.type === 'textarea' ? (
              <textarea
                value={values[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                disabled={loading}
                rows={3}
                className={`w-full bg-zinc-900 border rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none ${
                  errors[field.name] ? 'border-red-500/50' : 'border-zinc-700'
                }`}
              />
            ) : field.type === 'select' ? (
              <select
                value={values[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                disabled={loading}
                className={`w-full bg-zinc-900 border rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 ${
                  errors[field.name] ? 'border-red-500/50' : 'border-zinc-700'
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
                  values[field.name] === 'true' ? 'bg-blue-500' : 'bg-zinc-700'
                }`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white mt-0.5 transition-transform ${
                    values[field.name] === 'true' ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
                <span className="text-zinc-400 text-xs">{values[field.name] === 'true' ? 'On' : 'Off'}</span>
              </button>
            ) : (
              <input
                type={field.type || 'text'}
                value={values[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                disabled={loading}
                className={`w-full bg-zinc-900 border rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 ${
                  errors[field.name] ? 'border-red-500/50' : 'border-zinc-700'
                }`}
              />
            )}

            {errors[field.name] && (
              <p className="text-red-400 text-xs mt-1">{errors[field.name]}</p>
            )}
            {field.hint && !errors[field.name] && (
              <p className="text-zinc-600 text-xs mt-1">{field.hint}</p>
            )}
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Submitting...' : submitLabel}
      </button>
    </form>
  );
}

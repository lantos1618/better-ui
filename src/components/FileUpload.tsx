'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText } from 'lucide-react';

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url?: string;
}

export interface FileUploadViewProps {
  /** Accepted file types (e.g. "image/*,.pdf") */
  accept?: string;
  /** Max file size in bytes */
  maxSize?: number;
  /** Allow multiple files */
  multiple?: boolean;
  /** Already-uploaded files to display */
  files?: UploadedFile[];
  /** Called when user selects files */
  onUpload?: (files: File[]) => void;
  /** Title */
  title?: string;
  /** Loading state */
  loading?: boolean;
  /** Additional CSS class for the root element */
  className?: string;
}

export function FileUploadView({
  accept,
  maxSize,
  multiple = false,
  files = [],
  onUpload,
  title,
  loading = false,
  className,
}: FileUploadViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Validates a batch of files against the `maxSize` and `accept` props.
   *
   * NOTE: This is client-side UX filtering only. The `accept` attribute on the
   * native file input is not enforced for drag-and-dropped files, so we
   * re-check it here. Neither check is a security boundary — a malicious client
   * can bypass both. Server-side validation of file type and size is still
   * mandatory before trusting any uploaded file.
   */
  const validateFiles = useCallback((fileList: File[]): File[] => {
    setError(null);
    const valid: File[] = [];

    for (const file of fileList) {
      if (maxSize && file.size > maxSize) {
        setError(`${file.name} exceeds max size (${formatBytes(maxSize)})`);
        continue;
      }
      if (!isAcceptedFile(file, accept)) {
        setError(`${file.name} is not an accepted file type (${accept})`);
        continue;
      }
      valid.push(file);
    }

    if (!multiple && valid.length > 1) {
      return [valid[0]];
    }

    return valid;
  }, [maxSize, multiple, accept]);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const valid = validateFiles(Array.from(fileList));
    if (valid.length > 0) {
      onUpload?.(valid);
    }
  }, [validateFiles, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Display already-uploaded files
  if (files.length > 0 && !loading) {
    return (
      <div className={`bg-[var(--bui-bg-elevated,#27272a)] border border-[var(--bui-border-strong,#3f3f46)] rounded-xl overflow-hidden ${className || ''}`}>
        {title && (
          <div className="px-4 py-3 border-b border-[var(--bui-border-strong,#3f3f46)]">
            <p className="text-[var(--bui-fg-secondary,#a1a1aa)] text-sm font-medium">{title}</p>
          </div>
        )}
        <div className="divide-y divide-[var(--bui-border-strong,#3f3f46)]/50">
          {files.map((f, i) => (
            <div key={i} className="px-4 py-2.5 flex items-center gap-3">
              <FileIcon type={f.type} />
              <div className="min-w-0 flex-1">
                <p className="text-[var(--bui-fg-secondary,#a1a1aa)] text-sm truncate">{f.name}</p>
                <p className="text-[var(--bui-fg-faint,#52525b)] text-xs">{formatBytes(f.size)}</p>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--bui-success-fg,#6ee7b7)] shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[var(--bui-bg-elevated,#27272a)] border border-[var(--bui-border-strong,#3f3f46)] rounded-xl p-4 transition-opacity ${loading ? 'opacity-60' : ''} ${className || ''}`}>
      {title && <p className="text-[var(--bui-fg-secondary,#a1a1aa)] text-sm font-medium mb-3">{title}</p>}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-[var(--bui-primary-border,#2563eb80)] bg-[var(--bui-primary-muted,#1e3a5f)]'
            : 'border-[var(--bui-border-strong,#3f3f46)] hover:border-[var(--bui-border-strong,#3f3f46)] hover:bg-[var(--bui-bg-surface,#18181b)]/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <Upload size={32} strokeWidth={1.5} className="text-[var(--bui-fg-faint,#52525b)] mx-auto mb-2" />

        <p className="text-[var(--bui-fg-secondary,#a1a1aa)] text-sm">
          {isDragging ? 'Drop files here' : 'Click or drag files to upload'}
        </p>
        <p className="text-[var(--bui-fg-faint,#52525b)] text-xs mt-1">
          {accept ? accept : 'Any file type'}
          {maxSize ? ` (max ${formatBytes(maxSize)})` : ''}
        </p>
      </div>

      {error && (
        <p className="text-[var(--bui-error-fg,#f87171)] text-xs mt-2">{error}</p>
      )}

      {loading && (
        <div className="mt-3 flex items-center gap-2 text-[var(--bui-fg-secondary,#a1a1aa)] text-sm">
          <div className="w-1.5 h-1.5 bg-[var(--bui-fg-muted,#71717a)] rounded-full animate-pulse" />
          <span>Uploading...</span>
        </div>
      )}
    </div>
  );
}

/**
 * Returns true if `file` matches the `accept` spec (same syntax as the native
 * `<input accept>` attribute). Supports comma-separated entries of:
 *   - extension entries (".pdf")
 *   - exact MIME types ("image/png")
 *   - wildcard MIME types ("image/*")
 * An empty/absent `accept` accepts everything.
 *
 * This mirrors browser behavior so drag-and-dropped files are filtered the same
 * way the file picker's `accept` filters them. It is UX only, not a security
 * boundary — always validate file type server-side as well.
 *
 * Empty-MIME caveat: some browsers report an empty `file.type` for formats they
 * don't recognize (e.g. `.heic`). Such a file cannot be re-checked against
 * MIME-type accept entries. When the `accept` list is composed solely of
 * MIME-type entries (no extension entries that could still match on filename),
 * we accept the file rather than wrongly reject it — the native picker has
 * already applied the `accept` filter, and we have no reliable way to re-verify
 * a typeless file. Extension entries are always enforced against the filename.
 */
function isAcceptedFile(file: File, accept?: string): boolean {
  if (!accept || accept.trim() === '') return true;

  const fileType = (file.type || '').toLowerCase();
  const fileName = (file.name || '').toLowerCase();

  const tokens = accept
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0) return true;

  const hasExtensionToken = tokens.some((t) => t.startsWith('.'));

  // Typeless file (empty MIME) against a MIME-only accept list: can't re-check,
  // so trust the native picker's filtering rather than reject. If any extension
  // entry is present it may still match by filename, so fall through to it.
  if (fileType === '' && !hasExtensionToken) return true;

  return tokens.some((token) => {
    if (token.startsWith('.')) {
      // Extension match
      return fileName.endsWith(token);
    }
    if (token.endsWith('/*')) {
      // Wildcard MIME, e.g. "image/*"
      const prefix = token.slice(0, token.indexOf('/') + 1);
      return fileType.startsWith(prefix);
    }
    // Exact MIME match
    return fileType === token;
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  const isImage = type.startsWith('image/');
  const isPdf = type === 'application/pdf';

  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
      isImage ? 'bg-purple-900/30 text-purple-400' :
      isPdf ? 'bg-[var(--bui-error-muted,rgba(220,38,38,0.08))] text-[var(--bui-error-fg,#f87171)]' :
      'bg-[var(--bui-bg-hover,#3f3f46)] text-[var(--bui-fg-secondary,#a1a1aa)]'
    }`}>
      <FileText size={16} strokeWidth={1.5} />
    </div>
  );
}

'use client';

import React, { useState, useRef, useCallback } from 'react';

// ============================================
// Types
// ============================================

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
}

// ============================================
// Component
// ============================================

export function FileUploadView({
  accept,
  maxSize,
  multiple = false,
  files = [],
  onUpload,
  title,
  loading = false,
}: FileUploadViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((fileList: File[]): File[] => {
    setError(null);
    const valid: File[] = [];

    for (const file of fileList) {
      if (maxSize && file.size > maxSize) {
        setError(`${file.name} exceeds max size (${formatBytes(maxSize)})`);
        continue;
      }
      valid.push(file);
    }

    if (!multiple && valid.length > 1) {
      return [valid[0]];
    }

    return valid;
  }, [maxSize, multiple]);

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
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
        {title && (
          <div className="px-4 py-3 border-b border-zinc-700">
            <p className="text-zinc-300 text-sm font-medium">{title}</p>
          </div>
        )}
        <div className="divide-y divide-zinc-700/50">
          {files.map((f, i) => (
            <div key={i} className="px-4 py-2.5 flex items-center gap-3">
              <FileIcon type={f.type} />
              <div className="min-w-0 flex-1">
                <p className="text-zinc-300 text-sm truncate">{f.name}</p>
                <p className="text-zinc-600 text-xs">{formatBytes(f.size)}</p>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-zinc-800 border border-zinc-700 rounded-xl p-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
      {title && <p className="text-zinc-300 text-sm font-medium mb-3">{title}</p>}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500/50 bg-blue-500/5'
            : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900/50'
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

        <svg className="w-8 h-8 text-zinc-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>

        <p className="text-zinc-400 text-sm">
          {isDragging ? 'Drop files here' : 'Click or drag files to upload'}
        </p>
        <p className="text-zinc-600 text-xs mt-1">
          {accept ? accept : 'Any file type'}
          {maxSize ? ` (max ${formatBytes(maxSize)})` : ''}
        </p>
      </div>

      {error && (
        <p className="text-red-400 text-xs mt-2">{error}</p>
      )}

      {loading && (
        <div className="mt-3 flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span>Uploading...</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// Helpers
// ============================================

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
      isPdf ? 'bg-red-900/30 text-red-400' :
      'bg-zinc-700 text-zinc-400'
    }`}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    </div>
  );
}

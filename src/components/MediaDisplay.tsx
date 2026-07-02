'use client';

import React, { useState } from 'react';

export interface MediaItem {
  url: string;
  type: 'image' | 'video' | 'audio';
  alt?: string;
  caption?: string;
}

/**
 * Determine whether a media URL is safe to place into an img/video/audio `src`.
 *
 * Media items frequently originate from tool output or LLM-generated content,
 * which is untrusted. Without filtering, values like `javascript:` URLs or
 * arbitrary `data:` payloads could be used for XSS or to smuggle unexpected
 * content. This allowlist permits only:
 *   - http: / https: absolute URLs
 *   - protocol-relative (`//host/...`) and relative URLs (no scheme)
 *   - blob: URLs (produced locally via URL.createObjectURL)
 *   - data: URLs whose MIME type matches the element kind (image/video/audio)
 *
 * @param url  The candidate URL.
 * @param kind The media element the URL will be used in.
 * @returns true if the URL is safe to render for the given media kind.
 */
export function isSafeMediaUrl(url: string, kind: 'image' | 'video' | 'audio'): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed === '') return false;

  // Reject any ASCII control character. Browsers strip interior control chars
  // (tabs, newlines, NULs) before resolving a URL, so "java\tscript:..." would
  // slip past the scheme test below — matching as schemeless/relative — yet
  // still execute. Rejecting outright preserves the allowlist's intent.
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return false;

  // Detect a leading scheme like "javascript:", "data:", "http:", etc.
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed);

  if (!schemeMatch) {
    // No scheme => relative or protocol-relative URL. These resolve against the
    // current origin and cannot introduce a new dangerous scheme.
    return true;
  }

  const scheme = schemeMatch[1].toLowerCase();

  switch (scheme) {
    case 'http':
    case 'https':
    case 'blob':
      return true;
    case 'data': {
      // Only allow data: URLs whose media type matches the element kind.
      const mimeMatch = /^data:([a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+)/.exec(trimmed);
      if (!mimeMatch) return false;
      const mime = mimeMatch[1].toLowerCase();
      return mime.startsWith(`${kind}/`);
    }
    default:
      // javascript:, vbscript:, file:, and any other scheme are rejected.
      return false;
  }
}

export interface MediaDisplayViewProps {
  /** Media items to display */
  items: MediaItem[];
  /** Layout mode */
  layout?: 'grid' | 'stack';
  /** Title */
  title?: string;
  /** Loading state */
  loading?: boolean;
  /** Additional CSS class for the root element */
  className?: string;
}

export function MediaDisplayView({
  items,
  layout = 'grid',
  title,
  loading = false,
  className,
}: MediaDisplayViewProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (loading && items.length === 0) {
    return (
      <div className={`bg-[var(--bui-bg-elevated,#27272a)] border border-[var(--bui-border-strong,#3f3f46)] rounded-xl p-4 ${className || ''}`}>
        <div className="flex items-center gap-2 text-[var(--bui-fg-secondary,#a1a1aa)] text-sm">
          <div className="w-1.5 h-1.5 bg-[var(--bui-fg-muted,#71717a)] rounded-full animate-pulse" />
          <span>Loading media...</span>
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  const gridCols = items.length === 1 ? 'grid-cols-1' :
    items.length === 2 ? 'grid-cols-2' :
    items.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className={`bg-[var(--bui-bg-elevated,#27272a)] border border-[var(--bui-border-strong,#3f3f46)] rounded-xl overflow-hidden transition-opacity ${loading ? 'opacity-60' : ''} ${className || ''}`}>
      {title && (
        <div className="px-4 py-3 border-b border-[var(--bui-border-strong,#3f3f46)]">
          <div className="flex items-center justify-between">
            <p className="text-[var(--bui-fg-secondary,#a1a1aa)] text-sm font-medium">{title}</p>
            <span className="text-[var(--bui-fg-muted,#71717a)] text-xs">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {layout === 'grid' ? (
        <div className={`grid ${gridCols} gap-1 p-1`}>
          {items.map((item, i) => (
            <MediaItemRenderer
              key={i}
              item={item}
              onImageClick={() => setLightboxIndex(i)}
              compact={items.length > 1}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {items.map((item, i) => (
            <MediaItemRenderer
              key={i}
              item={item}
              onImageClick={() => setLightboxIndex(i)}
              compact={false}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex != null && items[lightboxIndex]?.type === 'image' && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl"
          >
            &times;
          </button>
          {items.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(Math.max(0, lightboxIndex - 1)); }}
                disabled={lightboxIndex === 0}
                className="absolute left-4 text-white/60 hover:text-white text-3xl disabled:opacity-20"
              >
                &lsaquo;
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(Math.min(items.length - 1, lightboxIndex + 1)); }}
                disabled={lightboxIndex >= items.length - 1}
                className="absolute right-4 text-white/60 hover:text-white text-3xl disabled:opacity-20"
              >
                &rsaquo;
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {isSafeMediaUrl(items[lightboxIndex].url, 'image') ? (
            <img
              src={items[lightboxIndex].url}
              alt={items[lightboxIndex].alt || ''}
              className="max-w-full max-h-full object-contain rounded"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <UnsafeMediaPlaceholder kind="image" onClick={(e) => e.stopPropagation()} />
          )}
          {items[lightboxIndex].caption && (
            <p className="absolute bottom-6 text-white/70 text-sm text-center">
              {items[lightboxIndex].caption}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MediaItemRenderer({
  item,
  onImageClick,
  compact,
}: {
  item: MediaItem;
  onImageClick: () => void;
  compact: boolean;
}) {
  if (item.type === 'image') {
    const safe = isSafeMediaUrl(item.url, 'image');
    return (
      <div className="relative group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {safe ? (
          <img
            src={item.url}
            alt={item.alt || ''}
            className={`w-full object-cover rounded cursor-pointer hover:opacity-90 transition-opacity ${
              compact ? 'h-32' : 'h-auto max-h-80'
            }`}
            onClick={onImageClick}
          />
        ) : (
          <UnsafeMediaPlaceholder kind="image" className={compact ? 'h-32' : 'h-40'} />
        )}
        {item.caption && !compact && (
          <p className="text-[var(--bui-fg-muted,#71717a)] text-xs mt-1">{item.caption}</p>
        )}
      </div>
    );
  }

  if (item.type === 'video') {
    const safe = isSafeMediaUrl(item.url, 'video');
    return (
      <div>
        {safe ? (
          <video
            src={item.url}
            controls
            className={`w-full rounded bg-black ${compact ? 'max-h-32' : 'max-h-80'}`}
          >
            <track kind="captions" />
          </video>
        ) : (
          <UnsafeMediaPlaceholder kind="video" className={compact ? 'h-32' : 'h-40'} />
        )}
        {item.caption && !compact && (
          <p className="text-[var(--bui-fg-muted,#71717a)] text-xs mt-1">{item.caption}</p>
        )}
      </div>
    );
  }

  if (item.type === 'audio') {
    const safe = isSafeMediaUrl(item.url, 'audio');
    return (
      <div className="bg-[var(--bui-bg-surface,#18181b)] rounded-lg p-3">
        {safe ? (
          <audio src={item.url} controls className="w-full" />
        ) : (
          <UnsafeMediaPlaceholder kind="audio" />
        )}
        {item.caption && (
          <p className="text-[var(--bui-fg-muted,#71717a)] text-xs mt-2">{item.caption}</p>
        )}
      </div>
    );
  }

  return null;
}

/**
 * Rendered in place of a media element whose URL failed the safety check.
 * Shows a harmless, inert placeholder rather than emitting an untrusted `src`.
 */
function UnsafeMediaPlaceholder({
  kind,
  className,
  onClick,
}: {
  kind: 'image' | 'video' | 'audio';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      role="img"
      aria-label={`Unavailable ${kind}: blocked unsafe source`}
      onClick={onClick}
      data-testid="unsafe-media-placeholder"
      className={`w-full flex items-center justify-center rounded bg-[var(--bui-bg-surface,#18181b)] text-[var(--bui-fg-muted,#71717a)] text-xs ${className || 'h-24'}`}
    >
      <span>Media unavailable</span>
    </div>
  );
}

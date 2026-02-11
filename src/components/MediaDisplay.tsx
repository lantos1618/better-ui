'use client';

import React, { useState } from 'react';

// ============================================
// Types
// ============================================

export interface MediaItem {
  url: string;
  type: 'image' | 'video' | 'audio';
  alt?: string;
  caption?: string;
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
}

// ============================================
// Component
// ============================================

export function MediaDisplayView({
  items,
  layout = 'grid',
  title,
  loading = false,
}: MediaDisplayViewProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (loading && items.length === 0) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
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
    <div className={`bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden transition-opacity ${loading ? 'opacity-60' : ''}`}>
      {title && (
        <div className="px-4 py-3 border-b border-zinc-700">
          <div className="flex items-center justify-between">
            <p className="text-zinc-300 text-sm font-medium">{title}</p>
            <span className="text-zinc-500 text-xs">{items.length} item{items.length !== 1 ? 's' : ''}</span>
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
          <img
            src={items[lightboxIndex].url}
            alt={items[lightboxIndex].alt || ''}
            className="max-w-full max-h-full object-contain rounded"
            onClick={(e) => e.stopPropagation()}
          />
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

// ============================================
// Individual item renderer
// ============================================

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
    return (
      <div className="relative group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.url}
          alt={item.alt || ''}
          className={`w-full object-cover rounded cursor-pointer hover:opacity-90 transition-opacity ${
            compact ? 'h-32' : 'h-auto max-h-80'
          }`}
          onClick={onImageClick}
        />
        {item.caption && !compact && (
          <p className="text-zinc-500 text-xs mt-1">{item.caption}</p>
        )}
      </div>
    );
  }

  if (item.type === 'video') {
    return (
      <div>
        <video
          src={item.url}
          controls
          className={`w-full rounded bg-black ${compact ? 'max-h-32' : 'max-h-80'}`}
        >
          <track kind="captions" />
        </video>
        {item.caption && !compact && (
          <p className="text-zinc-500 text-xs mt-1">{item.caption}</p>
        )}
      </div>
    );
  }

  if (item.type === 'audio') {
    return (
      <div className="bg-zinc-900 rounded-lg p-3">
        <audio src={item.url} controls className="w-full" />
        {item.caption && (
          <p className="text-zinc-500 text-xs mt-2">{item.caption}</p>
        )}
      </div>
    );
  }

  return null;
}

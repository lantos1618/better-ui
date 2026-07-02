/**
 * React render tests for pre-built view components
 *
 * Covers the security/validation hardening in:
 *   - MediaDisplay  (media URL allowlist)
 *   - FileUpload    (accept + maxSize enforcement for dropped files)
 *   - CodeBlock     (code rendering, copy button, diff view; shiki falls back
 *                    to plain text in jsdom)
 *
 * jsdom environment (see jest.config.js `react` project).
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MediaDisplayView, isSafeMediaUrl } from '../components/MediaDisplay';
import { FileUploadView } from '../components/FileUpload';
import { CodeBlockView } from '../components/CodeBlock';

// ---------------------------------------------------------------------------
// MediaDisplay
// ---------------------------------------------------------------------------

describe('isSafeMediaUrl', () => {
  it('allows http, https, blob, relative and protocol-relative URLs', () => {
    expect(isSafeMediaUrl('http://example.com/a.png', 'image')).toBe(true);
    expect(isSafeMediaUrl('https://example.com/a.png', 'image')).toBe(true);
    expect(isSafeMediaUrl('blob:https://example.com/uuid', 'image')).toBe(true);
    expect(isSafeMediaUrl('/local/a.png', 'image')).toBe(true);
    expect(isSafeMediaUrl('images/a.png', 'image')).toBe(true);
    expect(isSafeMediaUrl('//cdn.example.com/a.png', 'image')).toBe(true);
  });

  it('allows data: URLs whose MIME matches the media kind', () => {
    expect(isSafeMediaUrl('data:image/png;base64,AAAA', 'image')).toBe(true);
    expect(isSafeMediaUrl('data:video/mp4;base64,AAAA', 'video')).toBe(true);
    expect(isSafeMediaUrl('data:audio/mpeg;base64,AAAA', 'audio')).toBe(true);
  });

  it('rejects javascript: and mismatched / non-media data: URLs', () => {
    expect(isSafeMediaUrl('javascript:alert(1)', 'image')).toBe(false);
    expect(isSafeMediaUrl('data:text/html,<script>alert(1)</script>', 'image')).toBe(false);
    expect(isSafeMediaUrl('data:image/png;base64,AAAA', 'video')).toBe(false);
    expect(isSafeMediaUrl('vbscript:msgbox(1)', 'image')).toBe(false);
    expect(isSafeMediaUrl('', 'image')).toBe(false);
  });

  it('rejects a scheme obfuscated with an interior control char (tab)', () => {
    // Browsers strip interior control chars before resolving, so "java\tscript:"
    // would otherwise slip past the scheme test as a schemeless/relative URL.
    expect(isSafeMediaUrl('java\tscript:alert(1)', 'image')).toBe(false);
    expect(isSafeMediaUrl('java\nscript:alert(1)', 'image')).toBe(false);
    expect(isSafeMediaUrl('java\x00script:alert(1)', 'image')).toBe(false);
  });
});

describe('MediaDisplayView', () => {
  it('renders an <img> for a safe https image URL', () => {
    const { container } = render(
      <MediaDisplayView items={[{ url: 'https://example.com/a.png', type: 'image' }]} />
    );
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('https://example.com/a.png');
  });

  it('renders an <img> for a blob URL', () => {
    const { container } = render(
      <MediaDisplayView items={[{ url: 'blob:https://example.com/uuid', type: 'image' }]} />
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'blob:https://example.com/uuid'
    );
  });

  it('renders an <img> for a data:image URL', () => {
    const { container } = render(
      <MediaDisplayView
        items={[{ url: 'data:image/png;base64,AAAA', type: 'image' }]}
      />
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'data:image/png;base64,AAAA'
    );
  });

  it('does NOT render an <img> for a javascript: URL (shows placeholder)', () => {
    const { container } = render(
      <MediaDisplayView items={[{ url: 'javascript:alert(1)', type: 'image' }]} />
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTestId('unsafe-media-placeholder')).toBeInTheDocument();
  });

  it('does NOT render an <img> for a non-image data: URL', () => {
    const { container } = render(
      <MediaDisplayView
        items={[{ url: 'data:text/html,<script>alert(1)</script>', type: 'image' }]}
      />
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTestId('unsafe-media-placeholder')).toBeInTheDocument();
  });

  it('does NOT render a <video> for an unsafe URL', () => {
    const { container } = render(
      <MediaDisplayView items={[{ url: 'javascript:alert(1)', type: 'video' }]} />
    );
    expect(container.querySelector('video')).toBeNull();
    expect(screen.getByTestId('unsafe-media-placeholder')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// FileUpload
// ---------------------------------------------------------------------------

function makeFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  // jsdom does not let you set size via the constructor content reliably.
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function dropFiles(dropZone: Element, files: File[]) {
  fireEvent.drop(dropZone, {
    dataTransfer: { files },
  });
}

describe('FileUploadView', () => {
  it('accepts a valid dropped file that matches accept and size', () => {
    const onUpload = jest.fn();
    const { container } = render(
      <FileUploadView accept="image/*" maxSize={1000} onUpload={onUpload} />
    );
    const dropZone = container.querySelector('[class*="border-dashed"]')!;

    dropFiles(dropZone, [makeFile('photo.png', 'image/png', 500)]);

    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload.mock.calls[0][0]).toHaveLength(1);
    expect(onUpload.mock.calls[0][0][0].name).toBe('photo.png');
  });

  it('rejects a dropped file with the wrong type', () => {
    const onUpload = jest.fn();
    const { container } = render(
      <FileUploadView accept="image/*" onUpload={onUpload} />
    );
    const dropZone = container.querySelector('[class*="border-dashed"]')!;

    dropFiles(dropZone, [makeFile('doc.pdf', 'application/pdf', 100)]);

    expect(onUpload).not.toHaveBeenCalled();
    expect(screen.getByText(/not an accepted file type/i)).toBeInTheDocument();
  });

  it('accepts a file by extension entry (.pdf)', () => {
    const onUpload = jest.fn();
    const { container } = render(
      <FileUploadView accept=".pdf" onUpload={onUpload} />
    );
    const dropZone = container.querySelector('[class*="border-dashed"]')!;

    dropFiles(dropZone, [makeFile('report.pdf', 'application/pdf', 100)]);

    expect(onUpload).toHaveBeenCalledTimes(1);
  });

  it('accepts a file by exact MIME type', () => {
    const onUpload = jest.fn();
    const { container } = render(
      <FileUploadView accept="image/png" onUpload={onUpload} />
    );
    const dropZone = container.querySelector('[class*="border-dashed"]')!;

    dropFiles(dropZone, [makeFile('a.png', 'image/png', 100)]);
    expect(onUpload).toHaveBeenCalledTimes(1);

    onUpload.mockClear();
    dropFiles(dropZone, [makeFile('a.jpg', 'image/jpeg', 100)]);
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('rejects an oversized dropped file', () => {
    const onUpload = jest.fn();
    const { container } = render(
      <FileUploadView maxSize={1000} onUpload={onUpload} />
    );
    const dropZone = container.querySelector('[class*="border-dashed"]')!;

    dropFiles(dropZone, [makeFile('big.png', 'image/png', 5000)]);

    expect(onUpload).not.toHaveBeenCalled();
    expect(screen.getByText(/exceeds max size/i)).toBeInTheDocument();
  });

  it('accepts any file when no accept is provided', () => {
    const onUpload = jest.fn();
    const { container } = render(<FileUploadView onUpload={onUpload} />);
    const dropZone = container.querySelector('[class*="border-dashed"]')!;

    dropFiles(dropZone, [makeFile('anything.xyz', 'application/octet-stream', 10)]);
    expect(onUpload).toHaveBeenCalledTimes(1);
  });

  it('accepts an empty-MIME file (e.g. .heic) against a MIME-only accept', () => {
    // Some browsers report an empty `file.type` for formats they don't
    // recognize. The native picker already applied `accept`, so a MIME-only
    // accept list must not reject a typeless file we can't re-check.
    const onUpload = jest.fn();
    const { container } = render(
      <FileUploadView accept="image/*" onUpload={onUpload} />
    );
    const dropZone = container.querySelector('[class*="border-dashed"]')!;

    dropFiles(dropZone, [makeFile('photo.heic', '', 100)]);

    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload.mock.calls[0][0][0].name).toBe('photo.heic');
  });

  it('still enforces extension entries for an empty-MIME file', () => {
    // When the accept list contains an extension entry, a typeless file is
    // matched by filename — a non-matching name is still rejected.
    const onUpload = jest.fn();
    const { container } = render(
      <FileUploadView accept=".pdf" onUpload={onUpload} />
    );
    const dropZone = container.querySelector('[class*="border-dashed"]')!;

    dropFiles(dropZone, [makeFile('photo.heic', '', 100)]);
    expect(onUpload).not.toHaveBeenCalled();

    dropFiles(dropZone, [makeFile('report.pdf', '', 100)]);
    expect(onUpload).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// CodeBlock
// ---------------------------------------------------------------------------

describe('CodeBlockView', () => {
  it('renders code text (plain-text fallback)', () => {
    render(<CodeBlockView code={'const a = 1;'} language="js" />);
    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
  });

  it('renders line numbers when enabled', () => {
    render(
      <CodeBlockView code={'line1\nline2\nline3'} showLineNumbers language="js" />
    );
    // Line number gutter renders 1, 2, 3
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('copy button writes code to the clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<CodeBlockView code={'copy me'} language="js" />);

    const button = screen.getByRole('button', { name: /copy/i });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(writeText).toHaveBeenCalledWith('copy me');
    expect(screen.getByText('Copied')).toBeInTheDocument();
  });

  it('renders the diff view with before/after toggles', () => {
    render(
      <CodeBlockView
        code=""
        diff={{ before: 'old line\nshared', after: 'new line\nshared' }}
      />
    );

    // Toggle buttons
    expect(screen.getByRole('button', { name: 'before' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'diff' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'after' })).toBeInTheDocument();

    // Default diff view shows removed and added lines
    expect(screen.getByText('old line')).toBeInTheDocument();
    expect(screen.getByText('new line')).toBeInTheDocument();

    // Switch to "before"
    fireEvent.click(screen.getByRole('button', { name: 'before' }));
    expect(screen.getByText(/old line/)).toBeInTheDocument();
  });
});

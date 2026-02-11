'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

function ShikiCode({ code, language }: { code: string; language: string }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    import('shiki').then(({ codeToHtml }) => {
      codeToHtml(code, { lang: language, theme: 'github-dark' })
        .then(setHtml)
        .catch(() => setHtml(null));
    });
  }, [code, language]);

  if (html) {
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <code className="text-zinc-200">{code}</code>;
}

export interface MarkdownProps {
  content: string;
  className?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

const components: Components = {
  pre({ children, ...props }) {
    // Extract code text for copy button
    let codeText = '';
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.props) {
        const childProps = child.props as { children?: React.ReactNode };
        if (typeof childProps.children === 'string') {
          codeText = childProps.children;
        }
      }
    });

    return (
      <div className="relative group my-3">
        <CopyButton text={codeText} />
        <pre className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 overflow-x-auto text-sm" {...props}>
          {children}
        </pre>
      </div>
    );
  },

  code({ className, children, ...props }) {
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      const language = className!.replace('language-', '');
      const codeText = typeof children === 'string' ? children : String(children).replace(/\n$/, '');
      return <ShikiCode code={codeText} language={language} />;
    }
    return (
      <code className="bg-zinc-700 text-zinc-200 px-1.5 py-0.5 rounded text-sm" {...props}>
        {children}
      </code>
    );
  },

  h1({ children, ...props }) {
    return <h1 className="text-xl font-bold text-zinc-100 mt-4 mb-2" {...props}>{children}</h1>;
  },
  h2({ children, ...props }) {
    return <h2 className="text-lg font-semibold text-zinc-100 mt-3 mb-2" {...props}>{children}</h2>;
  },
  h3({ children, ...props }) {
    return <h3 className="text-base font-semibold text-zinc-200 mt-3 mb-1" {...props}>{children}</h3>;
  },

  p({ children, ...props }) {
    return <p className="mb-2 last:mb-0" {...props}>{children}</p>;
  },

  ul({ children, ...props }) {
    return <ul className="list-disc list-inside mb-2 space-y-1" {...props}>{children}</ul>;
  },
  ol({ children, ...props }) {
    return <ol className="list-decimal list-inside mb-2 space-y-1" {...props}>{children}</ol>;
  },
  li({ children, ...props }) {
    return <li className="text-zinc-300" {...props}>{children}</li>;
  },

  blockquote({ children, ...props }) {
    return (
      <blockquote className="border-l-2 border-zinc-600 pl-3 my-2 text-zinc-400 italic" {...props}>
        {children}
      </blockquote>
    );
  },

  table({ children, ...props }) {
    return (
      <div className="overflow-x-auto my-3">
        <table className="min-w-full border border-zinc-700 text-sm" {...props}>
          {children}
        </table>
      </div>
    );
  },
  thead({ children, ...props }) {
    return <thead className="bg-zinc-800" {...props}>{children}</thead>;
  },
  th({ children, ...props }) {
    return <th className="px-3 py-2 text-left text-zinc-300 font-medium border-b border-zinc-700" {...props}>{children}</th>;
  },
  td({ children, ...props }) {
    return <td className="px-3 py-2 text-zinc-400 border-b border-zinc-800" {...props}>{children}</td>;
  },

  a({ children, href, ...props }) {
    return (
      <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },

  hr(props) {
    return <hr className="border-zinc-700 my-4" {...props} />;
  },

  del({ children, ...props }) {
    return <del className="text-zinc-500" {...props}>{children}</del>;
  },
};

/**
 * Renders markdown content with GFM support, styled code blocks, and a copy button.
 */
export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={`prose-invert max-w-none ${className || ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

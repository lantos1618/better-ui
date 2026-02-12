'use client';

/**
 * Pre-made chat components for Better UI
 */

export { ChatProvider, useChatContext } from './ChatProvider';
export type { ChatProviderProps, ToolPartInfo } from './ChatProvider';

export { Thread } from './Thread';
export type { ThreadProps } from './Thread';

export { Message } from './Message';
export type { MessageProps } from './Message';

export { Composer } from './Composer';
export type { ComposerProps } from './Composer';

export { ToolResult } from './ToolResult';
export type { ToolResultProps } from './ToolResult';

export { Chat } from './Chat';
export type { ChatProps } from './Chat';

export { Markdown } from './Markdown';
export type { MarkdownProps } from './Markdown';

export { Panel, ChatPanel } from './Panel';
export type { PanelProps } from './Panel';

export { useToolEffect } from './useToolEffect';
export type { ToolEffectCallback } from './useToolEffect';

export { useToolOutput } from './useToolOutput';
export type { ToolOutputResult } from './useToolOutput';

export { useChatToolOutput } from './useChatToolOutput';

export { createToolStateStore, useToolState } from './useToolStateStore';
export type { ToolStateStore, ToolStateEntry } from './useToolStateStore';

export { ThemeProvider } from './ThemeProvider';
export type { ThemeProviderProps } from './ThemeProvider';

// View building blocks — use these in your tool .view() functions
export { QuestionView } from './Question';
export type { QuestionViewProps, QuestionOption } from './Question';

export { FormView } from './Form';
export type { FormViewProps, FormField } from './Form';

export { DataTableView } from './DataTable';
export type { DataTableViewProps, DataTableColumn } from './DataTable';

export { ProgressView } from './Progress';
export type { ProgressViewProps, ProgressStep } from './Progress';

export { MediaDisplayView } from './MediaDisplay';
export type { MediaDisplayViewProps, MediaItem } from './MediaDisplay';

export { CodeBlockView } from './CodeBlock';
export type { CodeBlockViewProps } from './CodeBlock';

export { ToastProvider, useToast } from './Toast';
export type { Toast } from './Toast';

export { FileUploadView } from './FileUpload';
export type { FileUploadViewProps, UploadedFile } from './FileUpload';
